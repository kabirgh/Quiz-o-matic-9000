package main

import (
	"context"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	Register int = 0
	Click    int = 1
	Ping     int = 2
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
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			runtime.LogInfof(a.ctx, "Read error: %v", err)
			break
		}

		buzzerData := strings.Split(string(message), ",")
		if len(buzzerData) != 2 {
			// Handle error
			continue
		}

		buzzerID, _ := strconv.Atoi(buzzerData[0])
		action, _ := strconv.Atoi(buzzerData[1])

		if buzzerID <= 10 {
			runtime.LogWarningf(a.ctx, "Buzzer %d cannot have an ID <= 10", buzzerID)
			continue
		}

		switch action {
		case Register:
			runtime.LogInfof(a.ctx, "Buzzer %d registered", buzzerID)
		case Click:
			runtime.LogInfof(a.ctx, "Buzzer %d clicked", buzzerID)
		case Ping:
			if err := conn.WriteMessage(messageType, []byte("pong")); err != nil {
				runtime.LogInfof(a.ctx, "Write error: %v", err)
			}
		default:
			runtime.LogWarningf(a.ctx, "Buzzer %d sent invalid action %d.", buzzerID, action)
		}
	}
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
