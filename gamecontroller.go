package main

import (
	"encoding/json"
	"slices"
	"time"

	"github.com/harry1453/go-xinput/xinput"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) ReadControllers() *string {
	// Buzzer id : controller state
	state := map[string]xinput.ControllerState{}

	a.buzzersMutex.RLock()
	defer a.buzzersMutex.RUnlock()
	for _, buzzer := range a.buzzers {
		if buzzer.Controller == nil {
			// For keyboard or boxes
			continue
		}

		if buzzer.Controller.state == nil {
			runtime.LogErrorf(a.ctx, "Controller state is nil for buzzer %s", buzzer.Id)
			continue
		}

		state[buzzer.Id] = *buzzer.Controller.state
	}

	if len(state) == 0 {
		return nil
	}

	stateJson, err := json.Marshal(state)
	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to marshal state: %s", err)
		return nil
	}

	str := string(stateJson)
	return &str
}

// Should be called in a goroutine
func (a *App) pollForControllers() {
	if xinput.LoadError != nil {
		runtime.LogErrorf(a.ctx, "xinput load error: %s", xinput.LoadError)
		return
	}

	for {
		indexes := xinput.GetConnectedControllers()

		buzzerIds := a.ListBuzzerIds()

		for _, index := range indexes {
			buzzerId := index.String()

			if slices.Contains(buzzerIds, buzzerId) {
				continue
			}

			runtime.LogInfof(a.ctx, "%s connected", index)

			// Initialize controller. State will be set in pollControllerInput
			controller := Controller{index: index, state: nil}

			a.buzzersMutex.Lock()
			a.buzzers = append(a.buzzers, Buzzer{Id: buzzerId, Controller: &controller})
			a.buzzersMutex.Unlock()
			runtime.EventsEmit(a.ctx, "connect", buzzerId)

			// Start listening for controller input
			go a.pollControllerInput(index, buzzerId)
		}

		time.Sleep(500 * time.Millisecond)
	}
}

func (a *App) pollControllerInput(index xinput.ControllerIndex, buzzerId string) {
	defer a.handleDisconnect(buzzerId)

	var oldState *xinput.ControllerState
	for {
		newState, err := xinput.GetControllerState(index)
		if err != nil {
			runtime.LogErrorf(a.ctx, "Error polling state for %s: %s", buzzerId, err.Error())
			return
		}

		if oldState == nil {
			oldState = newState
			time.Sleep(10 * time.Millisecond)
			continue
		}

		a.checkButtonPress(oldState, newState, buzzerId)
		a.updateControllerState(buzzerId, newState)

		oldState = newState
		time.Sleep(10 * time.Millisecond)
	}
}

func (a *App) handleDisconnect(buzzerId string) {
	runtime.LogInfof(a.ctx, "%s disconnected", buzzerId)

	a.buzzersMutex.Lock()
	defer a.buzzersMutex.Unlock()

	for i, buzzer := range a.buzzers {
		if buzzer.Id == buzzerId {
			a.buzzers = append(a.buzzers[:i], a.buzzers[i+1:]...)
			break
		}
	}

	runtime.EventsEmit(a.ctx, "disconnect", buzzerId)
}

func (a *App) checkButtonPress(oldState, newState *xinput.ControllerState, buzzerId string) {
	if (newState.Buttons.A && !oldState.Buttons.A) ||
		(newState.Buttons.B && !oldState.Buttons.B) ||
		(newState.Buttons.X && !oldState.Buttons.X) ||
		(newState.Buttons.Y && !oldState.Buttons.Y) {
		runtime.LogInfof(a.ctx, "Buzzer %s pressed", buzzerId)
		runtime.EventsEmit(a.ctx, "press", buzzerId)
	}
}

func (a *App) updateControllerState(buzzerId string, newState *xinput.ControllerState) {
	a.buzzersMutex.Lock()
	defer a.buzzersMutex.Unlock()

	for i, buzzer := range a.buzzers {
		if buzzer.Id == buzzerId {
			a.buzzers[i].Controller.state = newState
			break
		}
	}
}
