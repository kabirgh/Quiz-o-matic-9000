package main

import (
	"context"
	"net"
	"net/http"
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

func (a *App) registerBuzzer(buzzerId string, conn *websocket.Conn) {
	runtime.LogInfof(a.ctx, "Registering buzzer %s", buzzerId)
	a.buzzersMutex.Lock()
	a.buzzers = append(a.buzzers, Buzzer{Id: buzzerId, Conn: conn})
	a.buzzersMutex.Unlock()

	runtime.EventsEmit(a.ctx, "connect", buzzerId)
}

func (a *App) unregisterBuzzer(buzzerId string) {
	runtime.LogInfof(a.ctx, "Unregistering buzzer %s", buzzerId)
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
	queryParams := r.URL.Query()
	buzzerId := queryParams.Get("id")

	runtime.LogInfof(a.ctx, "Buzzer %s connected", buzzerId)

	if buzzerId == "" {
		runtime.LogErrorf(a.ctx, "No buzzer ID provided. Rejecting connection")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		runtime.LogInfof(a.ctx, "Websocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	a.registerBuzzer(buzzerId, conn)
	// Set 0 deadline to prevent read from blocking for initial connection
	// checkForDisconnection will update the deadline
	conn.SetReadDeadline(time.Time{})
	go a.checkForDisconnection(buzzerId, conn)

	for {
		_, message, err := conn.ReadMessage()

		// err might occur if read deadline is exceeded from checkForDisconnection code
		if err != nil {
			runtime.LogInfof(a.ctx, "Read error: %v. Unregistering buzzer %s", err, buzzerId)
			a.unregisterBuzzer(buzzerId)
			continue
		}

		msg := string(message)

		if msg != "1" {
			runtime.LogWarningf(a.ctx, "Buzzer %s sent unexpected message: %s", buzzerId, msg)
		}

		runtime.LogInfof(a.ctx, "Buzzer %s pressed", buzzerId)
		runtime.EventsEmit(a.ctx, "press", buzzerId)
	}
}

// Check for disconnections with ping/pong
func (a *App) checkForDisconnection(buzzerId string, conn *websocket.Conn) {
	pongWait := 5 * time.Second
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
				runtime.LogErrorf(a.ctx, "Ping write to buzzer %s failed: %s. Unregistering buzzer", buzzerId, err)
				a.unregisterBuzzer(buzzerId)
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
