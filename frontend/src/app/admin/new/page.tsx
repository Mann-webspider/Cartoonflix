"use client";
import { FormEvent, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagsInput } from "react-tag-input-component";
import { Button } from "@/components/ui/button";
// import { createMovieMetadataForm } from "../actions";
import { toast } from "@/components/ui/use-toast";
import { setCookie } from "cookies-next";
import DynamicForm from "@/components/custom/DynamicForm";





export default function Page() {
 
  return(<>
  <div className="flex h-full w-screen">

  <DynamicForm initialData={{}} />
  </div>
  </>)
}
