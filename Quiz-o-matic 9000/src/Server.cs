using System;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Windows.Threading;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace Quiz_o_matic_9000
{
    public class Server
    {
        // UDP multicast so buzzers can discover this IP address
        private static UdpClient udpClient;
        private static byte[] bytesToSend;
        private static IPEndPoint remoteEp;
        // Websocket server
        private static WebSocketServer server;
        private static string wsPort = "4649";
        public static IProgress<int> Buzzer_OnRegister;
        public static IProgress<int> Buzzer_OnClick;
        public static IProgress<string> Buzzer_OnError;

        // UI thread receives updates from callbacks passed to method
        public static void Start(IProgress<int> Buzzer_OnRegister, IProgress<int> Buzzer_OnClick,
                                 IProgress<string> Buzzer_OnError)
        {
            server = new WebSocketServer(int.Parse(wsPort));
            server.AddWebSocketService<BuzzerBehaviour>("/");

            Server.Buzzer_OnRegister = Buzzer_OnRegister;
            Server.Buzzer_OnClick = Buzzer_OnClick;
            Server.Buzzer_OnError = Buzzer_OnError;

            server.Start();

            multicastWsPort();
        }

        private static void multicastWsPort()
        {
            bytesToSend = Encoding.ASCII.GetBytes(wsPort);  // Buttons should connect to websocket at the port number broadcasted
            udpClient = new UdpClient();
            IPAddress multicastAddress = IPAddress.Parse("239.1.1.234");
            udpClient.JoinMulticastGroup(multicastAddress);
            remoteEp = new IPEndPoint(multicastAddress, 4210);  // Send multicast to this address and port

            DispatcherTimer dispatcherTimer = new DispatcherTimer();
            dispatcherTimer.Tick += dispatcherTimer_Tick;
            dispatcherTimer.Interval = new TimeSpan(0, 0, 2);  // Send every 2 seconds
            dispatcherTimer.Start();
        }

        private static void dispatcherTimer_Tick(object sender, EventArgs e)
        {
            udpClient.Send(bytesToSend, bytesToSend.Length, remoteEp);
        }

        public static void Stop()
        {
            server.Stop();
        }

        class BuzzerBehaviour : WebSocketBehavior
        {
            private enum BuzzerAction { Register=0, Click=1, Ping=2 };

            // e.Data is string with format buzzerNumber,BuzzerAction enum.
            // eg. "12,1" means buzzer 12 is clicking. "63,0" means buzzer 63 is registering.
            protected override void OnMessage(MessageEventArgs e)
            {
                var buzzerData = e.Data.Split(',').Select(str => int.Parse(str)).ToList();

                if (buzzerData[0] <= 10)
                {
                    Buzzer_OnError.Report($"Buzzer {buzzerData[0]} cannot have an ID <= 10");
                    return;
                }

                if (buzzerData[1] == (int)BuzzerAction.Register)
                {
                    Buzzer_OnRegister.Report(buzzerData[0]);
                }
                else if (buzzerData[1] == (int)BuzzerAction.Click)
                {
                    Buzzer_OnClick.Report(buzzerData[0]);
                }
                else if (buzzerData[1] == (int)BuzzerAction.Ping)
                {
                    Send("pong");
                }
                else
                {
                    Buzzer_OnError.Report($"Buzzer {buzzerData[0]} sent invalid action code {buzzerData[1]}.");
                }
            }
        }
    }
}