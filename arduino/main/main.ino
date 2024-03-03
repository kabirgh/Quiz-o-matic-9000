#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <WebSocketsClient.h>
#include <Ticker.h>

#define DEVICE_ID "11"

// Set DEBUG to 0 for production code (disables communication over serial port).
#define DEBUG 0

#ifdef DEBUG
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
  char wsServerIp[20];
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
  static unsigned long lastPressTime = 0;
  static int prevState = RELEASED;
  static bool ignoreLongPress = false;

  if (digitalRead(BUTTON) == PRESSED)
  {
    if (prevState == RELEASED)
    {
      sendClick();
      lastPressTime = millis(); // Button was just pressed. Record start time so we can calculate hold duration
    }

    // If button was held pressed more than 2 seconds, record a long press. Send register event.
    if (millis() - lastPressTime > 2000 && !ignoreLongPress)
    {
      registerBuzzer();
      ignoreLongPress = true; // Do not re-record long press if button is held for longer
    }

    prevState = PRESSED;
  }
  else
  {
    prevState = RELEASED;
    ignoreLongPress = false;
  }

  delay(5);
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

  const char *remoteIp = Udp.remoteIP().toString().c_str();
  PRINTF("Received %d bytes from IP address %s, port %d\n", packetSize, remoteIp, Udp.remotePort());
  int len = Udp.read(incomingPacket, 31);
  if (len > 0)
  {
    incomingPacket[len] = 0;
  }
  PRINTF("UDP packet contents: %s\n", incomingPacket);

  sprintf(wsServerIpBuf, "%s", remoteIp);               // Write IP address of sender into buffer
  *wsPort = (uint16_t)strtol(incomingPacket, NULL, 10); // Write contents of packet as port number, base 10
}

void startWebSocket(char *wsServerIp, uint16_t wsPort)
{
  PRINTF("Opening websocket to ws://%s:%u/\n", wsServerIp, wsPort);
  webSocket.begin(wsServerIp, wsPort, "/");
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
    // pingSendTime = ping();
    break;
  case WStype_TEXT:
    msgReceivedTime = millis();
    if (strcmp((const char *)payload, "pong") == 0)
    { // If msg is reply to ping
      PRINTF("[Ws] Roundtrip latency: %u\n", msgReceivedTime - pingSendTime);
    }
    else
    {
      PRINTF("[Ws] Received text: %s\n", payload);
    }
    break;
  case WStype_BIN:
    PRINTF("[Ws] Received binary, length: %u\n", length);
    HEXDUMP(payload, length);
    break;
  }
}

void registerBuzzer()
{
  webSocket.sendTXT(DEVICE_ID ",0");
  PRINTLN("Sent register message.");
}

void sendClick()
{
  webSocket.sendTXT(DEVICE_ID ",1");
  PRINTLN("Sent click message.");
}

unsigned long ping()
{
  webSocket.sendTXT(DEVICE_ID ",2");
  return millis();
}
