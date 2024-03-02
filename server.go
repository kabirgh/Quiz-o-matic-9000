package main

import (
	"context"
	"errors"
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

func (a *App) getBuzzerIdFromConn(conn *websocket.Conn) (string, error) {
	for _, buzzer := range a.buzzers {
		if buzzer.Conn == conn {
			return buzzer.Id, nil
		}
	}

	return "", errors.New("Buzzer not found")
}

func (a *App) unregisterBuzzer(buzzerId string) {
	// Remove buzzer
	newBuzzers := []Buzzer{}
	for _, buzzer := range a.buzzers {
		if buzzer.Id != buzzerId {
			newBuzzers = append(newBuzzers, buzzer)
		}
	}
	a.buzzersMutex.Lock()
	a.buzzers = newBuzzers
	a.buzzersMutex.Unlock()

	runtime.EventsEmit(a.ctx, "disconnect", buzzerId)
}

func (a *App) buzzerHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		runtime.LogInfof(a.ctx, "Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	go a.checkForDisconnection(conn)

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			runtime.LogInfof(a.ctx, "Read error: %v", err)

			bId, err := a.getBuzzerIdFromConn(conn)
			if err != nil {
				runtime.LogErrorf(a.ctx, "Buzzer not found: %v", err)
				break
			}

			runtime.LogInfof(a.ctx, "%s disconnected", bId)
			a.unregisterBuzzer(bId)
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
				continue
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

// Check for disconnections with ping/pong
func (a *App) checkForDisconnection(conn *websocket.Conn) {
	pongWait := 2 * time.Second
	pingPeriod := (pongWait * 9) / 10

	// Set the pong handler to update the read deadline upon receiving a pong
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// Launch a goroutine to send pings periodically
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()
		for range ticker.C {
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				buzzerId, getErr := a.getBuzzerIdFromConn(conn)
				if getErr != nil {
					runtime.LogErrorf(a.ctx, "Could not get buzzerId from conn: %v", getErr)
					return
				}

				runtime.LogErrorf(a.ctx, "Ping write to buzzer %s failed: %s", buzzerId, err)
				return // End the goroutine if we cannot send a ping
			}
		}
	}()
}

// Return half the round-trip time of ping to buzzer in ms
func (a *App) GetBuzzerLatencies() map[string]int {
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
