package main

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/harry1453/go-xinput/xinput"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Controller struct {
	index xinput.ControllerIndex
	state *xinput.ControllerState
}

// App struct
type App struct {
	ctx          context.Context
	teams        []Team
	buzzers      []Buzzer
	buzzersMutex sync.Mutex
}

type Buzzer struct {
	Id         string
	Conn       *websocket.Conn // buzzer boxes
	Controller *Controller     // game controllers
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
		buzzers: []Buzzer{
			{Id: "Keyboard", Conn: nil, Controller: nil},
		},
	}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	go a.startServer()        // Start the server in the background
	go a.pollForControllers() // Look for game controllers
}

// domReady is called after front-end resources have been loaded
// This is the earliest runtime is guaranteed to be available
func (a *App) domReady(ctx context.Context) {
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
}

// Frontend calls this to save teams across pages
func (a *App) SaveTeams(teams []Team) {
	a.teams = teams
}

func (a *App) ListTeams() []Team {
	return a.teams
}

func (a *App) ListBuzzerIds() []string {
	var buzzerIds []string
	for _, buzzer := range a.buzzers {
		buzzerIds = append(buzzerIds, buzzer.Id)
	}
	return buzzerIds
}
