Inter、Playfair Display、Noto Sans JPはGoogle Fonts配信のフォントを、現在の2232本文に含まれる文字へ絞って保存しています。書体名とデザインは変更していません。

各書体のSIL Open Font Licenseは同フォルダの `inter-OFL.txt`、`playfairdisplay-OFL.txt`、`notosansjp-OFL.txt` に同梱しています。

本文に新しい文字を追加した場合はサブセットを再生成してください。含まれない文字はCSSのフォールバック書体で表示されます。

Home typography parade: Anton, Bebas Neue, Abril Fatface, Space Mono, Bungee,
Cormorant Garamond, Archivo Black and Bodoni Moda. Each font contains only the
2232.inc glyph subset. Original SIL OFL text is provided as `<family>-OFL.txt`.

Noto Sans JPの `noto-sans-jp-complement-9023.woff2` は、ローカルに退避済みの同書体から「連」（U+9023）だけを抽出した補完ファイルです。既存と同じSIL OFL（`notosansjp-OFL.txt`）を適用し、CSSのunicode-rangeで必要な文字だけ読み込みます。
