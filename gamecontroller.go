package main

import (
	"encoding/json"
	"slices"
	"sync"
	"time"

	"github.com/harry1453/go-xinput/xinput"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// func (a *App) ReadControllerState(index int) *string {
// 	controller, ok := a.controllers[xinput.ControllerIndex(index)]
// 	if !ok {
// 		runtime.LogErrorf(a.ctx, "Controller %d not found", index)
// 		return nil
// 	}

// 	controller.mutex.RLock()
// 	defer controller.mutex.RUnlock()

// 	if controller.state == nil {
// 		runtime.LogErrorf(a.ctx, "State for controller %d is nil", index)
// 		return nil
// 	}

// 	jsonData, err := json.Marshal(controller.state)
// 	if err != nil {
// 		runtime.LogErrorf(a.ctx, "Failed to marshal controller state: %s", err)
// 		return nil
// 	}

// 	str := string(jsonData)
// 	return &str
// }

// Should be called in a goroutine
func (a *App) pollForControllers() {
	if xinput.LoadError != nil {
		runtime.LogErrorf(a.ctx, "xinput load error: %s", xinput.LoadError)
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

			a.buzzersMutex.Lock()
			a.buzzers = append(a.buzzers, Buzzer{Id: buzzerId, ControllerIndex: index})
			a.buzzersMutex.Unlock()
			runtime.EventsEmit(a.ctx, "connect", buzzerId)

			// Initialize controller. State will be set in pollControllerInput
			a.controllers[index] = &Controller{state: nil, mutex: sync.RWMutex{}}

			// Start listening for controller input
			go a.pollControllerInput(index, buzzerId)
		}

		time.Sleep(500 * time.Millisecond)
	}
}

func (a *App) pollControllerInput(index xinput.ControllerIndex, buzzerId string) {
	// Controller error or disconnection
	defer func() {
		if r := recover(); r != nil {
			// Remove buzzer
			runtime.LogInfof(a.ctx, "%s disconnected", index)
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

	var oldState *xinput.ControllerState
	for {
		newState, err := xinput.GetControllerState(index)
		if err != nil {
			runtime.LogError(a.ctx, err.Error())
			time.Sleep(10 * time.Millisecond)
			continue
		}

		// If this is the first time we are reading state, set it and wait till the next tick to record state
		if oldState == nil {
			oldState = newState
			time.Sleep(10 * time.Millisecond)
			continue
		}

		o, err := json.Marshal(oldState)
		if err != nil {
			runtime.LogError(a.ctx, err.Error())
			continue
		}
		runtime.LogDebugf(a.ctx, "Old state: %s", o)

		// Button pressed
		if (newState.Buttons.A && !oldState.Buttons.A) ||
			(newState.Buttons.B && !oldState.Buttons.B) ||
			(newState.Buttons.X && !oldState.Buttons.X) ||
			(newState.Buttons.Y && !oldState.Buttons.Y) {
			runtime.LogInfof(a.ctx, "Buzzer %s pressed", buzzerId)
			runtime.EventsEmit(a.ctx, "press", buzzerId)
		}

		oldState = newState

		// Update state
		controller, ok := a.controllers[xinput.ControllerIndex(index)]
		if !ok {
			runtime.LogErrorf(a.ctx, "Controller %d not found", index)
			time.Sleep(10 * time.Millisecond)
			continue
		}
		controller.mutex.Lock()
		controller.state = newState
		controller.mutex.Unlock()

		jsonData, err := json.Marshal(newState)
		if err != nil {
			runtime.LogError(a.ctx, err.Error())
			continue
		}
		runtime.LogDebugf(a.ctx, "%s: %s", index, jsonData)

		time.Sleep(10 * time.Millisecond)
	}
}
