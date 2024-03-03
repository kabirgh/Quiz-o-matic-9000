#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <WebSocketsClient.h>
#include <Ticker.h>

#define DEVICE_ID "Purple"

// Set DEBUG to 0 for production code (disables communication over serial port).
#define DEBUG 0

#if DEBUG
#define SERIAL_BEGIN(x) Serial.begin(x)
#define SERIAL_SET_DEBUG(x) Serial.setDebugOutput(x)
#define PRINT(x) Serial.print(x)
#define PRINTLN(x) Serial.println(x)
#define PRINTF(...) Serial.printf(__VA_ARGS__)
#define HEXDUMP(x, y) hexdump(x, y)
// Macros don't expand if debug is disabled
#else
#define SERIAL_BEGIN(x)
#define SERIAL_SET_DEBUG(x)
#define PRINT(x)
#define PRINTLN(x)
#define PRINTF(...)
#define HEXDUMP(x, y)
#endif

#define LED 4     // 4=D2. 2 is builtin
#define OFF LOW   // High for builtin
#define BUTTON 12 // 12=D6
#define PRESSED LOW
#define RELEASED HIGH

// Wifi AP information
const int DEBOUNCE_DELAY = 40;
const char *ssid = "qom";
const char *password = "esp8266button";
WiFiUDP Udp;
WebSocketsClient webSocket = WebSocketsClient();
Ticker ledTimer;

void toggleLed();
void connectToWifi();
void listenForUdpMulticast(char *wsServerIp, uint16_t *wsPort);
void startWebSocket(char *wsServerIp, uint16_t wsPort);
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length);
void registerBuzzer();
void sendClick();
unsigned long ping();

void setup()
{
  char wsServerIp[31];
  uint16_t wsPort;

  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);

  SERIAL_BEGIN(115200);
  SERIAL_SET_DEBUG(0); // Don't print esp8266 debug messages
  delay(10);

  // Blink every second to indicate device is setting up. Timer should detach when websocket connection is established.
  ledTimer.attach(0.5, toggleLed);
  connectToWifi();
  listenForUdpMulticast(wsServerIp, &wsPort); // Blocking listen until websocket ip and port are received
  startWebSocket(wsServerIp, wsPort);         // Connect to computer running Quiz-o-matic. Computer must be on same wifi network
}

void loop()
{
  static int prevButtonState = RELEASED;

  int reading = digitalRead(BUTTON);

  // Check for button state change
  // Don't bother debouncing, this is a quiz buzzer. Program handles multiple presses in quick succession.
  if (reading != prevButtonState)
  {
    prevButtonState = reading;
    if (reading == PRESSED)
    {
      sendClick();
    }
  }

  delay(5); // just in case
  webSocket.loop();
}

void toggleLed()
{
  digitalWrite(LED, !digitalRead(LED));
}

void connectToWifi()
{
  WiFi.mode(WIFI_STA); // Disable AP behaviour
  WiFi.begin(ssid, password);
  PRINTF("Connecting to %s", ssid);

  while (WiFi.status() != WL_CONNECTED)
  {
    PRINT(".");
    delay(500);
  }

  PRINTF("\nConnected, IP address: %s\n", WiFi.localIP().toString().c_str());
}

void listenForUdpMulticast(char *wsServerIpBuf, uint16_t *wsPort)
{
  // Look for multicast message sent by computer running Quiz-o-matic 9000 application. IP address of sender
  // is used for websocket address. Websocket port number is specified in packet contents.
  // This is essentially a very simple device discovery protocol.
  char incomingPacket[31]; // buffer
  IPAddress multicastIp = IPAddress(239, 1, 1, 234);
  int localUdpPort = 4210;

  Udp.beginMulticast(WiFi.localIP(), multicastIp, localUdpPort);
  PRINTF("Listening at IP address %s UDP port %d for multicast messages\n", multicastIp.toString().c_str(), localUdpPort);

  int packetSize = Udp.parsePacket();
  // Loop until UDP packet is received
  while (!packetSize)
  {
    packetSize = Udp.parsePacket();
    delay(10); // Let ESP8266 service wifi etc. and avoid soft reset
  }

  IPAddress remoteIp = Udp.remoteIP();
  PRINTF("Received %d bytes from IP address %s, port %d\n", packetSize, remoteIp.toString().c_str(), Udp.remotePort());
  int len = Udp.read(incomingPacket, 31);
  if (len > 0)
  {
    incomingPacket[len] = 0;
  }
  PRINTF("UDP packet contents: %s\n", incomingPacket);

  sprintf(wsServerIpBuf, "%s", remoteIp.toString().c_str()); // Write IP address of sender into buffer
  *wsPort = (uint16_t)strtol(incomingPacket, NULL, 10);      // Write contents of packet as port number, base 10
}

void startWebSocket(char *wsServerIp, uint16_t wsPort)
{
  PRINTF("Opening websocket to ws://%s:%u/?id=%s\n", wsServerIp, wsPort, DEVICE_ID);
  char url[50];
  // Send device id as query parameter
  sprintf(url, "/?id=%s", DEVICE_ID);

  webSocket.begin(wsServerIp, wsPort, url);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  static unsigned long pingSendTime;
  static unsigned long msgReceivedTime;

  switch (type)
  {
  case WStype_DISCONNECTED:
    PRINTLN("[Ws] Disconnected!");
    ledTimer.attach(0.5, toggleLed); // Connection problems. Blink led
    break;
  case WStype_CONNECTED:
    PRINTF("[Ws] Connected to url: %s\n", payload);
    ledTimer.detach(); // Stop blinking to indicate connection finished and buzzer can be registered
    digitalWrite(LED, OFF);
    break;
  case WStype_TEXT:
    PRINTF("[Ws] Received text: %s\n", payload);
    break;
  case WStype_BIN:
    PRINTF("[Ws] Received binary, length: %u\n", length);
    HEXDUMP(payload, length);
    break;
  }
}

void sendClick()
{
  static int number = 1;
  webSocket.sendTXT("1");
  PRINTF("Sent click message %d\n", number++);
}
