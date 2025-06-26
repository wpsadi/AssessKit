import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
export const userRouter = createTRPCRouter({
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
		return response;
	}),
});
