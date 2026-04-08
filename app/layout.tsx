export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<style>{`
					@font-face {
						font-family: 'KiwiSoda';
						src: url('/fonts/KiwiSoda.ttf') format('truetype');
					}
					@font-face {
						font-family: 'Typecast';
						src: url('/fonts/Typecast.ttf') format('truetype');
						font-weight: normal;
					}
					@font-face {
						font-family: 'Typecast';
						src: url('/fonts/Typecast-Bold.ttf') format('truetype');
						font-weight: bold;
					}
					html, body { margin: 0; padding: 0; overflow: hidden; font-family: 'Typecast', monospace; }
					canvas { display: block; }
				`}</style>
			</head>
			<body>{children}</body>
		</html>
	);
}
