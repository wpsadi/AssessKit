import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { revalidatePath } from "next/cache";
export const userRouter = createTRPCRouter({
	isAdmin: protectedProcedure.query(async ({ ctx }) => {
		const { isAdmin } = ctx;
		return isAdmin;
	}),
	
	getUser: protectedProcedure.query(async ({ ctx }) => {
		const { supabase } = ctx;
		const data = await supabase.auth.getUser();

		return data;
	}),
	getSession: protectedProcedure.query(async ({ ctx }) => {
		const { supabase } = ctx;
		const response = await supabase.auth.getSession();
		if (response.error) {
			throw response.error;
		}

		return response.data.session;
	}),
	signOut: protectedProcedure.mutation(async ({ ctx }) => {
		const { supabase } = ctx;
		const response = await supabase.auth.signOut();

		if (response.error) {
			throw response.error;
		}
		revalidatePath("/", "layout");
		return response;
	}),
});
