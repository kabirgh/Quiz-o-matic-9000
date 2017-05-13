
namespace Quiz_o_matic_9000.src
{
    class TeamData
    {
        public string Name { get; set; }
        public System.Windows.Media.SolidColorBrush Colour { get; set; }

        public TeamData(string name, System.Windows.Media.SolidColorBrush colour)
        {
            this.Name = name;
            this.Colour = colour;
        }

        override public string ToString()
        {
            return string.Format("Name: {0}, Colour: {1}", this.Name, this.Colour);
        }
    }
}
