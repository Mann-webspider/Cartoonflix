"use server"
import nodemailer,{Transporter} from "nodemailer"


const transporter:Transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: "maandalsania11@gmail.com",
    pass: "vlsv lqmh ddbm ikvs",
  },
});

// async..await is not allowed in global scope, must use a wrapper
export async function sendResetEmail(toEmail:string,userId:string) {
  const resetLink:string = `http://localhost:3000/auth/password-reset/${userId}`
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"CartoonFlix 😃" <maandalsania11@gmail.com>', // sender address
    to: toEmail, // list of receivers
    subject: "Password Reset", // Subject line
    text: "You requested a password reset. Click the link to reset your password: ${resetLink}", // plain text body
    html:  `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>
            <p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>
            <img src="https://media1.tenor.com/m/rgJleMzUa8MAAAAC/bailes.gif" alt="aha tamatar bade majedaar" width="30%">
            <script type="text/javascript" async src="https://tenor.com/embed.js"></script>
          </body>
        </html>`
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}

