using System;
using System.IO;
using System.Windows.Media;

namespace Quiz_o_matic_9000.src
{
    class FontStore
    {
        // Fonts
        public static readonly FontFamily Arvo;

        static FontStore()
        {
            Arvo = new FontFamily(new Uri("pack://application:,,,/fonts/Arvo-Regular.ttf"), "Arvo");
        }
    }
}
