package main

import (
	"encoding/json"
	"slices"
	"time"

	"github.com/harry1453/go-xinput/xinput"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var controllerState *xinput.ControllerState

func (a *App) ReadControllerState() *string {
	if controllerState == nil {
		return nil
	}

	jsonData, err := json.Marshal(controllerState)
	if err != nil {
		runtime.LogError(a.ctx, err.Error())
		return nil
	}

	str := string(jsonData)
	return &str
}

// Should be called in a goroutine
func (a *App) pollForControllers() {
	if xinput.LoadError != nil {
		runtime.LogErrorf(a.ctx, "xinput load error: %s", xinput.LoadError)
	}

	for {
		controllers := xinput.GetConnectedControllers()

		buzzerIds := a.ListBuzzerIds()

		for _, controller := range controllers {
			buzzerId := controller.String()

			if slices.Contains(buzzerIds, buzzerId) {
				continue
			}

			runtime.LogInfof(a.ctx, "%s connected", controller)

			a.buzzersMutex.Lock()
			a.buzzers = append(a.buzzers, Buzzer{Id: buzzerId, ControllerIndex: controller})
			a.buzzersMutex.Unlock()
			runtime.EventsEmit(a.ctx, "connect", buzzerId)

			// Start listening for controller input
			go a.pollControllerInput(controller, buzzerId)
		}

		time.Sleep(500 * time.Millisecond)
	}
}

func (a *App) pollControllerInput(controller xinput.ControllerIndex, buzzerId string) {
	// Controller error or disconnection
	defer func() {
		if r := recover(); r != nil {
			// Remove buzzer
			runtime.LogInfof(a.ctx, "%s disconnected", controller)
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
	}()

	for {
		newState, err := xinput.GetControllerState(controller)
		if err != nil {
			runtime.LogError(a.ctx, err.Error())
		}

		// Nothing changed, skip
		if controllerState != nil && *newState == *controllerState {
			continue
		}
		// Don't use mutex since we only update state in this goroutine
		controllerState = newState

		jsonData, err := json.Marshal(newState)

		if err != nil {
			runtime.LogError(a.ctx, err.Error())
			continue
		}

		runtime.LogDebugf(a.ctx, "%s: %s", controller, jsonData)

		if newState.Buttons.A || newState.Buttons.B || newState.Buttons.X || newState.Buttons.Y {
			runtime.LogInfof(a.ctx, "Buzzer %s pressed", buzzerId)
			runtime.EventsEmit(a.ctx, "press", buzzerId)
		}

		time.Sleep(10 * time.Millisecond)
	}
}
