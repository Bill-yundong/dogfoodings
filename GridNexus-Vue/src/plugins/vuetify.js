import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const myCustomTheme = {
  dark: true,
  colors: {
    background: '#0D1117',
    surface: '#161B22',
    primary: '#1F6FEB',
    secondary: '#8957E5',
    success: '#3FB950',
    warning: '#D29922',
    error: '#F85149',
    info: '#58A6FF'
  }
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'myCustomTheme',
    themes: {
      myCustomTheme
    }
  }
})
