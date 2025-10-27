import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { checkPermission } from "@/lib/permissions";

const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().min(3).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    contact: z
      .string()
      .regex(/^\d{10}$/, "Contact must be a 10-digit number")
      .optional(),
    altContact: z
      .string()
      .regex(/^\d{10}$/, "Alternate contact must be a 10-digit number")
      .optional()
      .nullable(),
    referenceEmployee: z.string().optional().nullable(),
    reportingManager: z.string().optional().nullable(),
    empNo: z.string().optional(),
    aadhar_number: z
      .string()
      .regex(/^\d{12}$/, "Aadhar must be a 12-digit number")
      .optional()
      .nullable(),
    pan_number: z
      .string()
      .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN format")
      .optional()
      .nullable(),
    police_verification: z.string().optional().nullable(),
    fatherName: z.string().optional(),
    fatherPhone: z
      .string()
      .regex(/^\d{10}$/, "Father's phone number must be a 10-digit number")
      .optional()
      .nullable(),
    motherName: z.string().optional(),
    motherPhone: z
      .string()
      .regex(/^\d{10}$/, "Mother's phone number must be a 10-digit number")
      .optional()
      .nullable(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "DOB must be in YYYY-MM-DD format")
      .optional()
      .nullable(),
    leaveDays: z
      .number()
      .nonnegative("Leave days must be non-negative")
      .optional(),
    expectedInTime: z
      .string()
      .regex(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Expected in time must be in HH:mm format"
      )
      .optional(),
    expectedOutTime: z
      .string()
      .regex(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Expected out time must be in HH:mm format"
      )
      .optional(),
    compOff: z
      .number()
      .nonnegative("Comp off days must be non-negative")
      .optional(),
    compOffAction: z
      .enum(["pay", "leave"])
      .optional()
      .refine((val) => !val || val === "pay" || val === "leave", {
        message: "Comp off action must be 'pay' or 'leave'",
      }),
    compOffPaymentAmount: z
      .number()
      .positive("Payment amount must be positive")
      .optional(),
  })
  .strict()
  .refine(
    (data) => !(data.compOffAction === "pay" && !data.compOffPaymentAmount),
    {
      message: "Payment amount is required for comp off 'pay' action",
      path: ["compOffPaymentAmount"],
    }
  );

const selectFields = {
  id: true,
  email: true,
  username: true,
  role: true,
  userType: true,
  empNo: true,
  store: true,
  store_info: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  address: true,
  city: true,
  contact: true,
  altContact: true,
  govtID: true,
  restricted: true,
  referenceEmployee: true,
  reportingManager: true,
  aadhar_number: true,
  aadhar_file: true,
  pan_number: true,
  pan_file: true,
  police_verification: true,
  police_verification_file: true,
  additionalDocuments: true,
  isHrPortalFirstLogin: true,
  fatherName: true,
  fatherPhone: true,
  motherName: true,
  motherPhone: true,
  profilePicture: true,
  dob: true,
  leaveDays: true,
  expectedInTime: true,
  expectedOutTime: true,
  compOff: true,
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const email = searchParams.get("email");
    const id = searchParams.get("id");
    const empId = searchParams.get("empId");
    const all = searchParams.get("all") === "true";
    const storeName = searchParams.get("storeName");

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profile: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch users by store name
    if (storeName) {
      let users;
      if (
        currentUser.profile === "hr_coordinator" ||
        currentUser.profile === "store_director" ||
        currentUser.profile === "md" ||
        currentUser.profile === "hr_coordinator_manager"
      ) {
        users = await db.user.findMany({
          where: { store: storeName },
          select: selectFields,
          orderBy: { createdAt: "asc" },
        });
      } else {
        return NextResponse.json(
          {
            error:
              "Forbidden: User does not have permission to access this store",
          },
          { status: 403 }
        );
      }

      if (!users.length) {
        return NextResponse.json(
          { error: "No users found for the specified store" },
          { status: 404 }
        );
      }

      return NextResponse.json(users, { status: 200 });
    }

    // Fetch all users
    if (all) {
      let users;
      if (
        currentUser.profile === "hr_coordinator" ||
        currentUser.profile === "store_director"
      ) {
        const hrStore = await db.store.findFirst({
          where: {
            OR: [
              { hrs: { some: { id: currentUser.id } } },
              { employees: { some: { id: currentUser.id } } },
            ],
          },
          select: { name: true },
        });

        if (!hrStore) {
          return NextResponse.json(
            { error: "Forbidden: User is not assigned to any store" },
            { status: 403 }
          );
        }

        users = await db.user.findMany({
          where: { store: hrStore.name },
          select: selectFields,
          orderBy: { createdAt: "asc" },
        });
      } else {
        users = await db.user.findMany({
          select: selectFields,
          orderBy: { createdAt: "asc" },
        });
      }

      return NextResponse.json(users, { status: 200 });
    }

    // Handle single user lookup
    if (username || email || id || empId) {
      const user = await db.user.findFirst({
        where: {
          OR: [
            username
              ? { username: { contains: username, mode: "insensitive" } }
              : {},
            email ? { email } : {},
            id ? { id } : {},
            empId ? { empNo: empId } : {},
          ],
        },
        select: selectFields,
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user, { status: 200 });
    }

    // Default: Fetch current user's own data
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: selectFields,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "Bad Request: User ID is required" },
        { status: 400 }
      );
    }

    // Check permissions for updating a user
    const permission = await checkPermission(session, "UPDATE_USER", {
      targetUserId: userId,
      storeBoundCheck: true,
    });

    if (!permission.isAuthorized) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    // Verify store assignment for store-bound profiles
    if (
      session?.user?.profile === "hr_coordinator" ||
      session?.user?.profile === "store_director"
    ) {
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { store: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }

      const hrStore = await db.store.findFirst({
        where: {
          OR: [
            { hrs: { some: { id: session!.user!.userId } } },
            { employees: { some: { id: session!.user!.userId } } },
          ],
        },
        select: { name: true },
      });

      if (!hrStore) {
        return NextResponse.json(
          { error: "Forbidden: User is not assigned to any store" },
          { status: 403 }
        );
      }

      if (targetUser.store !== hrStore.name) {
        return NextResponse.json(
          { error: "Forbidden: Can only update users in your own store" },
          { status: 403 }
        );
      }
    }

    // Parse request body
    const contentType = req.headers.get("content-type")?.toLowerCase() || "";
    let data: any;
    let formData: FormData | undefined;

    if (contentType.includes("application/json")) {
      const jsonBody = await req.json();
      const parsed = updateUserSchema.safeParse(jsonBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.errors },
          { status: 400 }
        );
      }
      data = parsed.data;
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      formData = await req.formData();
      console.log(formData);
      let jsonFields: any = {};
      // const jsonFields = formData.get("data")?.toString();
      // if (!jsonFields) {
      //   return NextResponse.json(
      //     { error: "Bad Request: Missing data field" },
      //     { status: 400 }
      //   );
      // }

      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== "aadhar_file" &&
          key !== "pan_file" &&
          key !== "police_verification_file" &&
          key !== "profilePicture"
        ) {
          jsonFields[key] = value;
        }
      });

      // const parsed = updateUserSchema.safeParse(JSON.parse(jsonFields));
      // if (!parsed.success) {
      //   return NextResponse.json(
      //     { error: "Invalid input", details: parsed.error.errors },
      //     { status: 400 }
      //   );
      // }
      // data = parsed.data;
      data = jsonFields;
    } else {
      return NextResponse.json(
        {
          error:
            'Unsupported Content-Type. Expected "application/json", "multipart/form-data", or "application/x-www-form-urlencoded"',
        },
        { status: 400 }
      );
    }

    // Validate and process files if formData exists (multipart/form-data)
    let aadharFileUrl: string | undefined;
    let panFileUrl: string | undefined;
    let policeVerificationFileUrl: string | undefined;
    let profilePictureUrl: string | undefined;
    let additionalDocuments: string[] = [];

    if (formData) {
      const allowedPdfTypes = ["application/pdf"];
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      const maxPdfSize = 5 * 1024 * 1024; // 5MB
      const maxImageSize = 2 * 1024 * 1024; // 2MB

      async function uploadFile(
        file: File,
        userId: string,
        folder: string,
        allowedTypes: string[],
        maxSize: number
      ) {
        if (!file.type || !allowedTypes.includes(file.type)) {
          throw new Error(
            `Invalid file type for ${file.name}. Allowed: ${allowedTypes.join(
              ", "
            )}`
          );
        }
        if (file.size > maxSize) {
          throw new Error(
            `File ${file.name} exceeds size limit of ${maxSize / 1024 / 1024}MB`
          );
        }

        const ext = file.name ? file.name.split(".").pop() : "";
        const filename = `${uuidv4()}.${ext}`;
        const filePath = `${userId}/${folder}/${filename}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const { error } = await supabase.storage
          .from("users")
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: true,
          });

        // console.log(error);

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("users")
          .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
      }

      const aadharFile = formData.get("aadhar_file");
      if (aadharFile instanceof File) {
        aadharFileUrl = await uploadFile(
          aadharFile,
          userId,
          "aadhar",
          allowedPdfTypes,
          maxPdfSize
        );
      }

      const panFile = formData.get("pan_file");
      if (panFile instanceof File) {
        panFileUrl = await uploadFile(
          panFile,
          userId,
          "pan",
          allowedPdfTypes,
          maxPdfSize
        );
      }

      const policeVerificationFile = formData.get("police_verification_file");
      if (policeVerificationFile instanceof File) {
        policeVerificationFileUrl = await uploadFile(
          policeVerificationFile,
          userId,
          "police",
          allowedPdfTypes,
          maxPdfSize
        );
      }

      const profilePicture = formData.get("profilePicture");
      if (profilePicture instanceof File) {
        profilePictureUrl = await uploadFile(
          profilePicture,
          userId,
          "profile",
          allowedImageTypes,
          maxImageSize
        );
      }

      const additionalFiles = formData
        .getAll("additionalDocuments")
        .filter((item): item is File => item instanceof File);
      if (additionalFiles.length > 0) {
        additionalDocuments = await Promise.all(
          additionalFiles.map((file) =>
            uploadFile(file, userId, "additional", allowedPdfTypes, maxPdfSize)
          )
        );
      }
    }

    // Prepare update data
    const userUpdate: any = {
      email: data.email,
      username: data.username,
      address: data.address,
      city: data.city,
      contact: data.contact,
      altContact: data.altContact,
      referenceEmployee: data.referenceEmployee,
      reportingManager: data.reportingManager,
      empNo: data.empNo,
      aadhar_number: data.aadhar_number,
      aadhar_file: aadharFileUrl,
      pan_number: data.pan_number,
      pan_file: panFileUrl,
      police_verification: data.police_verification,
      police_verification_file: policeVerificationFileUrl,
      profilePicture: profilePictureUrl,
      additionalDocuments:
        additionalDocuments.length > 0 ? additionalDocuments : undefined,
      fatherName: data.fatherName,
      fatherPhone: data.fatherPhone,
      motherName: data.motherName,
      motherPhone: data.motherPhone,
      dob: data.dob ? new Date(data.dob) : undefined,
      leaveDays: data.leaveDays,
      expectedInTime: data.expectedInTime
        ? new Date(`1970-01-01T${data.expectedInTime}:00.000Z`)
        : undefined,
      expectedOutTime: data.expectedOutTime
        ? new Date(`1970-01-01T${data.expectedOutTime}:00.000Z`)
        : undefined,
      compOff: data.compOff,
    };

    const updatedUser = await db.$transaction(async (tx) => {
      if (data.leaveDays !== undefined) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { leaveDays: true },
        });

        if (!user) {
          throw new Error("Target user not found");
        }
      }
      // Handle compOff compensation
      if (data.compOffAction) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { compOff: true, leaveDays: true },
        });

        if (!user || user.compOff === 0) {
          throw new Error("No comp off days available for compensation");
        }

        if (data.compOffAction === "leave") {
          userUpdate.leaveDays = (user.leaveDays || 0) + (user.compOff ?? 0);
          userUpdate.compOff = 0;
          await tx.compOffHistory.create({
            data: {
              employeeId: userId,
              compOffDays: user.compOff ?? 0,
              action: "leave",
            },
          });
        } else if (data.compOffAction === "pay") {
          userUpdate.compOff = 0;
          await tx.compOffHistory.create({
            data: {
              employeeId: userId,
              compOffDays: user.compOff ?? 0,
              action: "pay",
              amount: data.compOffPaymentAmount,
            },
          });
        }
      }

      // Update user
      const user = await tx.user.update({
        where: { id: userId },
        data: userUpdate,
        select: selectFields,
      });

      return user;
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: `Internal server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
