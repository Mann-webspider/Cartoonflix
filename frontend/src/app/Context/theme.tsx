"use client"
import { createContext ,useContext} from "react";

type Theme={
    colors:{
        primary: string
        secondary: string
        background: string
        text: string
        accent: string
        text_white: string
        text_dark: string
    }
}
// --text: #f3dfdf;
// --background: #1f1f1f;
// --primary: #e99191;
// --secondary: #9a1414;
// --accent: #f01616;
const defaultTheme : Theme = {
    colors:{
        primary:"[#e99191]",
        secondary:"[#9a1414]",
        background:"[#1f1f1f]",
        text:"[#f3dfdf]",
        accent:"[#f01616]",
        text_white:"white",
        text_dark:"black"
    }
}

const ThemeContext = createContext<Theme>(defaultTheme)

export function useTheme(){return useContext(ThemeContext)}
export function ThemeProvider({children}:{children:React.ReactNode}) {
    return (
        <ThemeContext.Provider value={defaultTheme} >
        {children}
        </ThemeContext.Provider>
    );
}