import nodemailer from  "nodemailer"
import ejs from "ejs"
import path from "path"

const _dirname = path.resolve()

const sendMail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMPT_POST || '587'),
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },

    })

    const {email, subject, template, data} = options

    // get the path to the email template file
    const templatePath = path.join(_dirname, "./mails", template)

    // Render the email template with EJS
    const html = await ejs.renderFile(templatePath, data)

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html
    }
    
    await transporter.sendMail(mailOptions)


}

export default sendMail