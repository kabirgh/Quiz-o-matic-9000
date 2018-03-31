using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace Quiz_o_matic_9000
{
    public class Server
    {
        private static WebSocketServer server;
        public static IProgress<int> Buzzer_OnRegister;
        public static IProgress<int> Buzzer_OnClick;
        public static IProgress<string> Buzzer_OnError;

        // UI thread receives updates from callbacks passed to method
        public static void Start(IProgress<int> Buzzer_OnRegister, IProgress<int> Buzzer_OnClick,
                                 IProgress<string> Buzzer_OnError)
        {
            server = new WebSocketServer(4649);
            server.AddWebSocketService<BuzzerBehaviour>("/buzz");

            Server.Buzzer_OnRegister = Buzzer_OnRegister;
            Server.Buzzer_OnClick = Buzzer_OnClick;
            Server.Buzzer_OnError = Buzzer_OnError;

            server.Start();
        }

        public static void Stop()
        {
            server.Stop();
        }

        class BuzzerBehaviour : WebSocketBehavior
        {
            private enum BuzzerAction { Register=0, Click=1 };
            
            // e.RawData is string with format BuzzerAction enum,buzzerNumber.
            // eg. "1,12" means buzzer 12 is clicking. "0,63" means buzzer 63 is registering.
            protected override void OnMessage(MessageEventArgs e)
            {
                var buzzerData = e.Data.Split(',').Select(str => int.Parse(str)).ToList();

                if (buzzerData[1] <= 10)
                {
                    Buzzer_OnError.Report($"Buzzer {buzzerData[1]} cannot have an ID <= 10");
                    return;
                }

                if (buzzerData[0] == (int)BuzzerAction.Register)
                {
                    Buzzer_OnRegister.Report(buzzerData[1]);
                }
                else if (buzzerData[0] == (int)BuzzerAction.Click)
                {
                    Buzzer_OnClick.Report(buzzerData[1]);
                }
                else
                {
                    Buzzer_OnError.Report($"Buzzer {buzzerData[1]} sent invalid action code {buzzerData[0]}.");
                }
            }
        }
    }
}