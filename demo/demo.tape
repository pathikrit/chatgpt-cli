# See https://github.com/charmbracelet/vhs
# Generate new demo by doing `vhs demo.tape`

Output demo.gif

Set Shell "bash"
Set FontSize 24
Set Width 2400
Set Height 1800
Set TypingSpeed 100ms
Set WindowBar Colorful

Type "cd ~/workspace/chatgpt-cli" Enter Sleep 2s
Type "yarn && node app.js" Enter Sleep 5s
Type "Hi! My name is Rick!" Enter Sleep 10s
Type "What's my name?" Enter Sleep 10s
Type "clear" Enter Sleep 5s
Type "What's my name?" Enter Sleep 10s
Type "Write a python code to add 2 numbers" Enter Sleep 15s
Type "copy" Enter Sleep 5s
Type "How do humans make babies. Respond in emojis only" Enter Sleep 10s
Type "What's the weather in nyc today?" Enter Sleep 30s
Sleep 20s
Type "[img] Happy cat" Enter Sleep 40s
Type "exit" Enter Sleep 10s
