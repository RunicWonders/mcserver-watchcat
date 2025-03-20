import '@mdi/font/css/materialdesignicons.min.css';
import 'vuetify/styles';
import {createVuetify} from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
	components,
	directives,
	icons: {defaultSet: 'mdi'},
	theme: {
		defaultTheme: matchMedia('(prefers-color-scheme: dark)').matches? 'dark': 'light',
		themes: {
			light: {
				dark: false,
			},
			dark: {
				dark: true,
			}
		}
	}
});

export default vuetify;