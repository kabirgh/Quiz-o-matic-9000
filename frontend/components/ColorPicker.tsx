import { StopOutlined } from "@ant-design/icons";

type ColorPickerProps = {
  colors: string[]; // must be unique
  size: number;
  selected: string | null;
  handleSelect: (color: string) => void;
  disabled?: (string | null)[];
};

// Controlled component to pick color
const ColorPicker = (props: ColorPickerProps) => {
  const { colors, size, selected, disabled, handleSelect } = props;

  return (
    <div
      className="picker-container"
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {colors.map((color, index) => {
        const isSelected: boolean = selected
          ? colors.indexOf(selected) === index
          : false;
        const isDisabled: boolean =
          !!disabled && disabled.includes(color) && !isSelected;
        return (
          <div
            key={color}
            className={!isDisabled ? "picker-color-unselected" : ""}
            style={{
              backgroundColor: color,
              opacity: isDisabled ? 0.3 : 1,
              height: isSelected ? 1.15 * size : size,
              width: isSelected ? 1.15 * size : size,
              margin: isSelected ? "0px" : "2px",
              boxSizing: "border-box",
              outline: isSelected ? `3px solid white` : "",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: isSelected ? 1 : 0,
            }}
            onClick={() => {
              if (!isDisabled && !isSelected) {
                handleSelect(color);
              }
            }}
          >
            {isDisabled ? (
              <StopOutlined
                style={{ color: "black", transform: "scaleX(-1)" }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default ColorPicker;
