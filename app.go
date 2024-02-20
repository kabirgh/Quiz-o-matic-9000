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
	teams        []Team
	buzzerIds    []string
}

type Team struct {
	Name     string  `json:"name"`
	Color    Color   `json:"color"`
	BuzzerId *string `json:"buzzerId"` // nilable
}

// Export Color enum to frontend
// https://wails.io/docs/howdoesitwork/#method-binding
type Color string

const (
	ColorRed        Color = "#E8293C"
	ColorBlue       Color = "#5596E6"
	ColorGreen      Color = "#00B4A0"
	ColorYellow     Color = "#FDD600"
	ColorPurple     Color = "#AF6EE8"
	ColorLightBrown Color = "#D2B0A4"
	ColorMidBlue    Color = "#305A80"
	ColorOrange     Color = "#FF9249"
)

var Colors = []struct {
	Value  Color
	TSName string
}{
	{ColorRed, "Red"},
	{ColorBlue, "Blue"},
	{ColorGreen, "Green"},
	{ColorYellow, "Yellow"},
	{ColorPurple, "Purple"},
	{ColorLightBrown, "LightBrown"},
	{ColorMidBlue, "MidBlue"},
	{ColorOrange, "Orange"},
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		teams: []Team{
			{Name: "", Color: ColorRed, BuzzerId: nil},
		},
	}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.serialDone = make(chan string, 1)
	a.serialCtx, a.cancelSerial = context.WithCancel(context.Background())

	go a.startServer() // Start the server in the background
}

// domReady is called after front-end resources have been loaded
// This is the earliest runtime is guaranteed to be available
func (a *App) domReady(ctx context.Context) {
	ports, err := a.ListPorts()
	if err == nil {
		// Start reading from first port in list
		// Not SetPort since that would close goroutine as soon as it starts
		go a.readSerial(a.serialCtx, ports[0])
	}
	// During development, so inspector window fits on the side
	runtime.WindowSetPosition(a.ctx, 0, 0)
	// During development, mock buzzer ids
	a.buzzerIds = []string{"Black", "Orange", "Purple", "White"}
	for i := 0; i < 4; i++ {
		runtime.EventsEmit(a.ctx, "newBuzzer", a.buzzerIds[i])
	}
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	a.cancelSerial()
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
	// Create new context for future cancellation
	a.serialCtx, a.cancelSerial = context.WithCancel(context.Background())
	go a.readSerial(a.serialCtx, portName)
}

// Frontend calls this to save teams across pages
func (a *App) SaveTeams(teams []Team) {
	a.teams = teams
}

func (a *App) ListTeams() []Team {
	return a.teams
}

func (a *App) ListBuzzerIds() []string {
	return a.buzzerIds
}

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
				// ctx was cancelled, close the port and return without error
				a.activePort.Close()
				return
			default:
				a.activePort.Close()
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
