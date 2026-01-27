/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", "class"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			display: [
  				'var(--font-display)',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'monospace'
  			]
  		},
  		colors: {
  			pastel: {
  				sky: '#B8E4F0',
  				skyLight: '#D4EEF7',
  				cloud: '#FFFFFF',
  				coral: '#F7ABAD',
  				coralLight: '#F9B4AE',
  				pink: '#F5C6D6',
  				pinkLight: '#FCE4EC',
  				mint: '#A1E5CC',
  				mintLight: '#D4F0E7',
  				cream: '#FFF8E7',
  				yellow: '#FFE5A0',
  				peach: '#FFD4B8',
  				lavender: '#E0D4F7',
  				purple: '#D4B8E8',
  				text: '#5A5A6E',
  				textLight: '#8B8B9E'
  			},
  			candy: {
  				pink: '#F5C6D6',
  				lightPink: '#FCE4EC',
  				mint: '#A1E5CC',
  				teal: '#80D3C4',
  				cream: '#FFF8E7',
  				yellow: '#FFE5A0',
  				lavender: '#E0D4F7',
  				deepBlue: '#5076D1',
  				white: '#FFFFFF',
  				dark: '#5A5A6E'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			soft: '0 4px 12px rgba(0,0,0,0.08)',
  			card: '0 8px 24px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
  			button: '0 4px 0 rgba(0,0,0,0.1)',
  			buttonHover: '0 2px 0 rgba(0,0,0,0.1)',
  			pill: '0 3px 0 rgba(0,0,0,0.08)'
  		},
  		borderRadius: {
  			xl2: '1.25rem',
  			'3xl': '1.5rem',
  			'4xl': '2rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'button-bounce': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-2px)'
  				}
  			},
  			press: {
  				'0%': {
  					transform: 'translateY(0)'
  				},
  				'100%': {
  					transform: 'translateY(2px)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			'cloud-drift': {
  				'0%': {
  					transform: 'translateX(0)'
  				},
  				'100%': {
  					transform: 'translateX(100vw)'
  				}
  			}
  		},
  		animation: {
  			'button-bounce': 'button-bounce .8s ease-in-out infinite',
  			press: 'press .08s linear forwards',
  			shimmer: 'shimmer 2.5s linear infinite',
  			float: 'float 3s ease-in-out infinite',
  			'cloud-drift': 'cloud-drift 60s linear infinite'
  		}
  	}
  },
  safelist: [
    {
      pattern:
        /(from|via|to)-(pastel|candy)-(sky|coral|pink|mint|cream|yellow|lavender|peach|purple)/,
    },
    {
      pattern:
        /bg-(pastel|candy)-(sky|coral|pink|mint|cream|yellow|lavender|peach|purple)/,
    },
  ],
  plugins: [require("tailwindcss-animate")],
};
