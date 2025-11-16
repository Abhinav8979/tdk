// app/api/policy/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "policy";
const PRIVILEGED_PROFILES = ["md", "hr_coordinator_manager"] as const;

async function isPrivileged(session: any): Promise<boolean> {
  if (!session?.user?.userId) return false;
  const user = await db.user.findUnique({
    where: { id: session.user.userId },
    select: { profile: true },
  });
  return !!user?.profile && PRIVILEGED_PROFILES.includes(user.profile as any);
}

function filePath(userId: string, policyId: string): string {
  return `${userId}/${policyId}.pdf`;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // const privileged = await isPrivileged(session);
  // if (!privileged)
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "A single PDF file is required" },
      { status: 400 }
    );
  }

  const policyId = uuidv4();
  const path = filePath(id, policyId);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const policy = await db.userPolicy.create({
    data: {
      userId: id,
      url: urlData.publicUrl,
      fileName: file.name,
      updatedBy: session.user.userId,
    },
  });

  return NextResponse.json(
    {
      id: policy.id,
      url: policy.url,
      fileName: policy.fileName,
      uploadedAt: policy.updatedAt,
    },
    { status: 201 }
  );
}

// export async function GET(
//   req: Request,
//   { params }: { params: { userId: string } }
// ) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user)
//     return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

//   const { userId } = params;
//   const { searchParams } = new URL(req.url);

//

//   const policyId = searchParams.get("policyId");

//   if (!policyId) {
//     return NextResponse.json(
//       { error: "policyId query param is required" },
//       { status: 400 }
//     );
//   }

//   const path = filePath(userId, policyId);

//   const { data, error } = await supabase.storage.from(BUCKET).download(path);
//   if (error || !data) {
//     return NextResponse.json({ error: "Policy not found" }, { status: 404 });
//   }

//   // Optional: get original filename
//   const policy = await db.userPolicy.findUnique({
//     where: { id: policyId },
//     select: { fileName: true },
//   });

//   const arrayBuffer = await data.arrayBuffer();
//   return new NextResponse(arrayBuffer, {
//     headers: {
//       "Content-Type": "application/pdf",
//       "Content-Disposition": `attachment; filename="${
//         policy?.fileName ?? `policy-${policyId}.pdf`
//       }"`,
//     },
//   });
// }

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = params; // already correct — no await needed

  console.log(id);
  console.log(session.user.userId);

  // Ownership check
  if (session.user.userId + "=" !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const policies = await db.userPolicy.findMany({
      // where: { userId: id }, // <-- You forgot this filter!
      select: {
        id: true,
        url: true,
        fileName: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ policies }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user policies:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // const privileged = await isPrivileged(session);
  // if (!privileged)
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const { searchParams } = new URL(req.url);
  const policyId = searchParams.get("policyId");

  if (!policyId) {
    return NextResponse.json(
      { error: "policyId query param is required" },
      { status: 400 }
    );
  }

  const path = filePath(id, policyId);

  const { error: deleteError } = await supabase.storage
    .from(BUCKET)
    .remove([path]);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await db.userPolicy.delete({
    where: { id: policyId },
  });

  return NextResponse.json({ message: "Policy deleted" }, { status: 200 });
}
