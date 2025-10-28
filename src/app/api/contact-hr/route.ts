import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";
import { z } from "zod";
// Placeholder email template (loaded from the HTML artifact)
const emailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Employee Issue Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563eb; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Employee Issue Notification</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px;">
              <p style="color: #333333; font-size: 16px; margin: 0 0 10px;">Dear HR Team,</p>
              <p style="color: #333333; font-size: 16px; margin: 0 0 20px;">
                An employee has submitted an issue for your attention. Please review the details below and take appropriate action.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 15px; border-radius: 4px;">
                <tr>
                  <td style="padding: 10px; font-size: 16px; color: #333333;">
                    <strong>From:</strong> {{employeeName}} ({{employeeEmail}})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-size: 16px; color: #333333;">
                    <strong>Store:</strong> {{storeName}}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-size: 16px; color: #333333;">
                    <strong>Subject:</strong> {{subject}}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-size: 16px; color: #333333;">
                    <strong>Message:</strong>
                    <p style="margin: 5px 0 0; line-height: 1.5;">{{message}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 20px;">
              <p style="color: #333333; font-size: 16px; margin: 0 0 20px;">
                Please respond to the employee directly or take necessary action through the HR portal.
              </p>
              <a href="{{hrPortalUrl}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 16px;">
                Go to HR Portal
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f4f4f4; padding: 15px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This email was sent from the Employee Management System. Please do not reply directly to this email.
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
                &copy; 2025 The Dream Kitchen. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Placeholder for email sending function (replace with real service, e.g., Nodemailer)
async function sendEmail({
  to,
  subject,
  message,
  from,
  employeeName,
  employeeEmail,
  storeName,
}: {
  to: string[];
  subject: string;
  message: string;
  from: string;
  employeeName: string;
  employeeEmail: string;
  storeName: string;
}) {
  // Replace placeholders in the template
  const hrPortalUrl = process.env.HR_PORTAL_URL || "localhost:3000"; // Set in environment variables
  let htmlContent = emailTemplate
    .replace("{{employeeName}}", employeeName)
    .replace("{{employeeEmail}}", employeeEmail)
    .replace("{{storeName}}", storeName)
    .replace("{{subject}}", subject)
    .replace("{{message}}", message.replace(/\n/g, "<br>")) // Convert newlines to <br> for HTML
    .replace("{{hrPortalUrl}}", hrPortalUrl);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from,
    to,
    subject,
    html: htmlContent,
  });
  return { success: true };
}

// Schema for validating request body
const contactHrSchema = z
  .object({
    subject: z
      .string()
      .min(1, "Subject is required")
      .max(100, "Subject must be 100 characters or less"),
    message: z
      .string()
      .min(1, "Message is required")
      .max(1000, "Message must be 1000 characters or less"),
  })
  .strict();

export async function POST(req: Request) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    // Fetch the current user's details
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, store: true, username: true, email: true },
    });

    if (!currentUser || !currentUser.store) {
      return NextResponse.json(
        { error: "User not found or not assigned to a store" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    console.log(body);
    const parsed = contactHrSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }
    const { subject, message } = parsed.data;

    // Fetch HR users for the employee's store
    const store = await db.store.findUnique({
      where: { name: currentUser.store },
      select: {
        hrs: {
          select: {
            email: true,
            profile: true,
          },
          where: {
            profile: {
              in: ["hr_coordinator"],
            },
          },
        },
      },
    });

    if (!store || !store.hrs || store.hrs.length === 0) {
      return NextResponse.json(
        { error: "No HR found for your store" },
        { status: 404 }
      );
    }

    // Extract HR emails
    const hrEmails = store.hrs.map((hr) => hr.email);

    // Send email to HRs
    const emailResult = await sendEmail({
      to: hrEmails,
      subject: `Employee Issue: ${subject}`,
      message,
      from: currentUser.email,
      employeeName: currentUser.username,
      employeeEmail: currentUser.email,
      storeName: currentUser.store,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Email sent successfully to HR" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error contacting HR:", error);
    return NextResponse.json(
      { error: `Internal server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
