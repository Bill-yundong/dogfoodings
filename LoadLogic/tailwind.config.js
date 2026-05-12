/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: '#165DFF',
				secondary: '#36D399',
				warning: '#FBBD23',
				danger: '#F87272',
				dark: '#1F2937'
			}
		}
	},
	plugins: []
};
