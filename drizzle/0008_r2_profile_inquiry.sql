ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_source_fk_matches_type";--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "student_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_source_fk_matches_type" CHECK ((
        ("inquiries"."source_type" = 'student' AND "inquiries"."project_id" IS NULL AND (
          ("inquiries"."student_id" IS NOT NULL AND "inquiries"."student_profile_id" IS NULL AND "inquiries"."source_id" = "inquiries"."student_id")
          OR
          ("inquiries"."student_id" IS NULL AND "inquiries"."student_profile_id" IS NOT NULL AND "inquiries"."source_id" = "inquiries"."student_profile_id"::text)
        ))
        OR
        ("inquiries"."source_type" = 'project' AND "inquiries"."project_id" IS NOT NULL AND "inquiries"."student_id" IS NULL AND "inquiries"."student_profile_id" IS NULL AND "inquiries"."source_id" = "inquiries"."project_id")
      ));