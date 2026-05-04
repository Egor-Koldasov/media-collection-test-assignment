export type StateSliderProps = {
  value: number
  onChange: (value: number) => void
  label?: string
  min?: number
  max?: number
}
export const StateSlider = (props: StateSliderProps) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: 200 }}>
      <div style={{ display: "flex", maxWidth: 200 }}>
        <span>{props.label}:</span>
        <input
          type="number"
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value))}
          style={{ width: 10, flexGrow: 1, textAlign: "right" }}
        />
      </div>
      <input
        type="range"
        min={props.min ?? -1000}
        max={props.max ?? 1000}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  )
}
