import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const result = await db.$transaction(async (tx) => {
      console.log("Fetching users...");
      const users = await tx.user.findMany({
        select: {
          id: true,
          store: true,
          storeId: true,
          profile: true,
        },
      });
      console.log(`Found ${users.length} users`);

      const storeUsersMap = new Map<string, { id: string; storeId: string | null; profile: string | null; originalStoreName: string }[]>();
      const nullStoreUsers: { id: string; storeId: string | null; profile: string | null }[] = [];

      for (const user of users) {
        if (user.store) {
          const lowerCaseStore = user.store.toLowerCase();
          const storeUsers = storeUsersMap.get(lowerCaseStore) || [];
          storeUsers.push({ id: user.id, storeId: user.storeId, profile: user.profile, originalStoreName: user.store });
          storeUsersMap.set(lowerCaseStore, storeUsers);
        } else {
          nullStoreUsers.push({ id: user.id, storeId: user.storeId, profile: user.profile });
        }
      }
      console.log(`Grouped ${storeUsersMap.size} stores, ${nullStoreUsers.length} users with null store`);

      console.log("Fetching existing stores...");
      const existingStores = await tx.store.findMany({
        select: { id: true, name: true, hrs: { select: { id: true } }, employees: { select: { id: true } } },
      });
      const existingStoreMap = new Map(existingStores.map((store) => [store.name.toLowerCase(), store]));
      console.log(`Found ${existingStores.length} existing stores`);

      const createdStores: string[] = [];
      for (const [lowerCaseStore, storeUsers] of storeUsersMap) {
        if (!existingStoreMap.has(lowerCaseStore)) {
          const storeName = storeUsers[0].originalStoreName;
          console.log(`Creating store: ${storeName}`);
          try {
            const newStore = await tx.store.create({
              data: {
                id: uuidv4(),
                name: storeName,
              },
            });
            await tx.calendar.create({
              data: {
                storeId: newStore.id,
                weekdayOff: "Sunday",
              },
            });
            createdStores.push(storeName);
            existingStoreMap.set(lowerCaseStore, { id: newStore.id, name: storeName, hrs: [], employees: [] });
            console.log(`Created store: ${storeName} with id: ${newStore.id}`);
          } catch (createError) {
            console.error(`Failed to create store ${storeName}:`, createError);
            continue;
          }
        }
      }

      const updatedUsers: string[] = [];
      const updatedEmployees: string[] = [];
      for (const [lowerCaseStore, storeUsers] of storeUsersMap) {
        const store = existingStoreMap.get(lowerCaseStore);
        if (!store) {
          console.warn(`Store ${lowerCaseStore} not found after creation`);
          continue;
        }
        const usersToUpdate = storeUsers.filter(
          (u) => u.storeId === null || u.storeId !== store.id
        );
        if (usersToUpdate.length > 0) {
          const updated = await tx.user.updateMany({
            where: {
              id: { in: usersToUpdate.map((u) => u.id) },
            },
            data: {
              store: store.name,
              storeId: store.id,
            },
          });
          if (updated.count > 0) {
            console.log(`Updated ${updated.count} users for store: ${store.name} (id: ${store.id})`);
            updatedUsers.push(...usersToUpdate.map((u) => u.id));
          }

          const usersToConnect = usersToUpdate.filter(
            (u) => !store.employees.some((e) => e.id === u.id)
          );
          if (usersToConnect.length > 0) {
            await tx.store.update({
              where: { id: store.id },
              data: {
                employees: {
                  connect: usersToConnect.map((u) => ({ id: u.id })),
                },
              },
            });
            console.log(`Connected ${usersToConnect.length} employees to store: ${store.name} (id: ${store.id})`);
            updatedEmployees.push(...usersToConnect.map((u) => u.id));
          }
        }
      }

      const hrUsers = users.filter((user) => user.profile === "hr_coordinator" || user.profile === "hr_coordinator_manager");
      const updatedHRs: string[] = [];
      for (const hr of hrUsers) {
        // Remove HR from all stores where they are incorrectly associated
        const storesWithHr = existingStores.filter((store) => store.hrs.some((h) => h.id === hr.id));
        for (const store of storesWithHr) {
          if (!hr.store || store.name.toLowerCase() !== hr.store.toLowerCase()) {
            console.log(`Removing HR ${hr.id} from store: ${store.name} (id: ${store.id})`);
            await tx.store.update({
              where: { id: store.id },
              data: { hrs: { disconnect: { id: hr.id } } },
            });
            updatedHRs.push(hr.id);
          }
        }

        // Associate HR with the correct store based on user.store
        if (hr.store && existingStoreMap.has(hr.store.toLowerCase())) {
          const store = existingStoreMap.get(hr.store.toLowerCase())!;
          if (!store.hrs.some((h) => h.id === hr.id)) {
            console.log(`Associating HR ${hr.id} with store: ${store.name} (id: ${store.id})`);
            await tx.store.update({
              where: { id: store.id },
              data: { hrs: { connect: { id: hr.id } } },
            });
            updatedHRs.push(hr.id);
          } else {
            console.log(`HR ${hr.id} already associated with store ${store.name}`);
          }
        } else {
          console.log(`Skipping HR ${hr.id}: No store or store ${hr.store} does not exist`);
        }
      }

      return {
        createdStores,
        updatedUsers: Array.from(new Set(updatedUsers)),
        updatedEmployees: Array.from(new Set(updatedEmployees)),
        updatedHRs: Array.from(new Set(updatedHRs)),
        unassignedUsers: nullStoreUsers.map((u) => u.id),
      };
    });

    console.log("Synchronization result:", JSON.stringify(result, null, 2));
    return NextResponse.json(
      {
        message: "Synchronization completed",
        createdStores: result.createdStores,
        updatedUsers: result.updatedUsers,
        updatedEmployees: result.updatedEmployees,
        updatedHRs: result.updatedHRs,
        unassignedUsers: result.unassignedUsers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Synchronization error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}