package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.bug.st/serial"
)

// App struct
type App struct {
	ctx          context.Context
	serialDone   chan string
	activePort   serial.Port
	serialCtx    context.Context
	cancelSerial context.CancelFunc
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.serialDone = make(chan string, 1)
	a.serialCtx, a.cancelSerial = context.WithCancel(context.Background())
}

// domReady is called after front-end resources have been loaded
// This is the earliest runtime is guaranteed to be available
func (a *App) domReady(ctx context.Context) {
	ports, err := a.ListPorts()
	if err == nil {
		// Not SetPort since that would close goroutine as soon as it starts
		go a.readSerial(a.serialCtx, ports[0])
	}
	// During development, so inspector window fits on the side
	runtime.WindowSetPosition(a.ctx, 0, 0)
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

func (a *App) ListPorts() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		runtime.LogErrorf(a.ctx, "error in enumerating ports: %s", err)
		return []string{}, err
	}
	if len(ports) == 0 {
		runtime.LogWarning(a.ctx, "no serial ports found")
		return []string{}, errors.New("no serial ports found")
	}
	return ports, nil
}

func (a *App) SetPort(portName string) {
	// Close previous serial connection. Guaranteed to exist since we call
	// readSerial in startup.
	a.cancelSerial()
	a.activePort.Close()
	// Create new context for future cancellation
	a.serialCtx, a.cancelSerial = context.WithCancel(context.Background())
	go a.readSerial(a.serialCtx, portName)
}

const (
	Register int = 0
	Buzz     int = 1
	Ping     int = 2
)

func (a *App) readSerial(sCtx context.Context, portName string) {
	defer func() {
		if r := recover(); r != nil {
			runtime.LogErrorf(a.ctx, "readSerial panicked while trying to read from: %s. Error: %s", portName, r)
		}
	}()

	// Set port
	port, err := serial.Open(portName, &serial.Mode{
		BaudRate: 115200,
	})
	if err != nil {
		runtime.LogError(a.ctx, err.Error())
	}
	a.activePort = port
	runtime.LogInfof(a.ctx, "--- reading from %s", portName)

	buf := make([]byte, 100)
	for {
		n, err := port.Read(buf)

		if err != nil {
			select {
			case <-sCtx.Done():
				return // ctx was cancelled, just return without error
			default:
				runtime.LogErrorf(a.ctx, "--- read error: %s", err)
				return
			}
		}

		if n == 0 {
			fmt.Println("\nEOF")
			continue
		}
		fmt.Printf("%v", string(buf[:n]))
	}
	// data is a string with format buzzerNumber,BuzzerAction enum.
	// eg. "12,1" means buzzer 12 is buzzing. "63,0" means buzzer 63 is registering.
}
