import { createColorScheme, createLocalStorage } from "@ui-sdk/core"

const colorScheme = createColorScheme({
  defaultValue: "dark",
  global: true,
  storage: createLocalStorage("deepeval-lab-color-scheme"),
})

export { colorScheme }
