# See https://github.com/charmbracelet/vhs
# Generate new demo by doing `vhs demo.tape`

Output demo.gif

Set Shell "bash"
Set FontSize 24
Set Width 2400
Set Height 1800
Set TypingSpeed 100ms
Set WindowBar Colorful

Type "cd ~/workspace/chatgpt-cli" Enter Sleep 1s
Type "yarn && node app.js" Enter Sleep 10s
Type "Hi! My name is Rick!" Enter Sleep 20s
Type "What's my name?" Enter Sleep 20s
Type "clear" Enter Sleep 10s
Type "What's my name?" Enter Sleep 20s
Type "Write a python code to add 2 numbers" Enter Sleep 20s
Type "copy" Enter Sleep 10s
Type "How do humans make babies. Respond in emojis only" Enter Sleep 20s
Type "What's the weather in nyc today?" Enter Sleep 60s
Type "[img] Happy cat" Enter Sleep 60s
Type "exit" Enter Sleep 20s
