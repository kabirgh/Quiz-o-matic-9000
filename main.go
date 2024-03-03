package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
)

//go:embed frontend/out/* frontend/out/_next/static/*/* frontend/out/_next/static/*/*/*
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:             "Quiz-o-matic",
		Width:             1024,
		Height:            768,
		DisableResize:     false,
		Frameless:         false,
		WindowStartState:  options.Maximised,
		StartHidden:       false,
		HideWindowOnClose: false,
		Assets:            assets,
		Menu:              nil,
		Logger:            nil,
		LogLevel:          logger.INFO,
		OnStartup:         app.startup,
		OnDomReady:        app.domReady,
		OnBeforeClose:     app.beforeClose,
		OnShutdown:        app.shutdown,
		Bind: []interface{}{
			app,
		},
		EnumBind: []interface{}{
			Colors,
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
