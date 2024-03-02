package main

import (
	"context"
	"net"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	Connect string = "0"
	Press   string = "1"
)

const wsPort = "4649"

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Always upgrade
	},
}

func (a *App) buzzerHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		runtime.LogInfof(a.ctx, "Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			runtime.LogInfof(a.ctx, "Read error: %v", err)
			break
		}

		buzzerData := strings.Split(string(message), ",")
		if len(buzzerData) != 2 {
			runtime.LogErrorf(a.ctx, "Invalid message: %s", message)
			continue
		}

		buzzerId := buzzerData[0]
		action := buzzerData[1]

		switch action {
		case Connect:
			runtime.LogInfof(a.ctx, "Buzzer %s connected", buzzerId)
			// Don't add the buzzer ID if it's already in the list
			buzzerIds := a.ListBuzzerIds()
			if slices.Contains(buzzerIds, buzzerId) {
				return
			}
			a.buzzersMutex.Lock()
			a.buzzers = append(a.buzzers, Buzzer{Id: buzzerId, Conn: conn})
			a.buzzersMutex.Unlock()
			runtime.EventsEmit(a.ctx, "connect", buzzerId)
		case Press:
			runtime.LogInfof(a.ctx, "Buzzer %s pressed", buzzerId)
			runtime.EventsEmit(a.ctx, "press", buzzerId)
		default:
			runtime.LogWarningf(a.ctx, "Buzzer %s sent invalid action %s.", buzzerId, action)
		}
	}
}

// Return half the round-trip time of ping to buzzer in ms
func (a *App) PingBuzzers() map[string]int {
	pingTimes := make(map[string]int)
	var wg sync.WaitGroup
	var mu sync.Mutex // Mutex for safe access to pingTimes map

	for _, buzzer := range a.buzzers {
		if buzzer.Conn == nil {
			continue
		}

		var pingSentTime time.Time

		buzzer.Conn.SetPongHandler(func(appData string) error {
			mu.Lock() // Ensure safe access to pingTimes
			pingTimes[buzzer.Id] = int(time.Since(pingSentTime).Milliseconds()) / 2
			mu.Unlock()

			runtime.LogInfof(a.ctx, "Pong received, round-trip time: %d", pingTimes[buzzer.Id])
			wg.Done() // Mark the pong as received
			return nil
		})

		wg.Add(1)

		pingSentTime = time.Now()

		err := buzzer.Conn.WriteMessage(websocket.PingMessage, []byte{})
		if err != nil {
			runtime.LogErrorf(a.ctx, "Ping error: %s", err)
			mu.Lock()
			pingTimes[buzzer.Id] = -1
			mu.Unlock()
			wg.Done() // Error occurred, mark this as done
		}
	}

	wg.Wait() // Wait for all pongs to be received or errors to be handled

	return pingTimes
}

func (a *App) startServer() {
	go a.broadcastUDP()

	// Wrap buzzerHandler method to be used with http.Handle
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a.buzzerHandler(w, r)
	})

	http.Handle("/", handler)
	srv := &http.Server{Addr: ":" + wsPort}

	go func() {
		runtime.LogInfof(a.ctx, "WebSocket server starting on : %v...", wsPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			runtime.LogErrorf(a.ctx, "ListenAndServe error: %v", err)
		}
	}()

	<-a.ctx.Done() // Wait for context cancellation

	runtime.LogInfof(a.ctx, "Shutting down WebSocket server...")
	if err := srv.Shutdown(context.Background()); err != nil {
		runtime.LogWarningf(a.ctx, "WebSocket server Shutdown failed: %v", err)
	}
}

func (a *App) broadcastUDP() {
	addr := "239.1.1.234:4210"
	udpAddr, err := net.ResolveUDPAddr("udp", addr)
	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to resolve UDP address: %v", err)
	}
	conn, err := net.DialUDP("udp", nil, udpAddr)
	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to dial UDP: %v", err)
	}
	defer conn.Close()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		message := []byte(wsPort)
		_, err := conn.Write(message)

		if err != nil {
			runtime.LogErrorf(a.ctx, "Failed to send message: %v", err)
			continue
		}

		runtime.LogDebugf(a.ctx, "Sent multicast message to %s: %s", addr, message)
	}
}
