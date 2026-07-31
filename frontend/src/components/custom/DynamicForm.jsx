"use client";
import { useState } from "react";
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
import {
  saveMetadata,
  uploadAsset,
  updateContent,
  handleMovieUpdate,
} from "@/api/addMovie";

import { setCookie } from "cookies-next";
import ProgressBar from "@/components/custom/ProgressBar";
import { Switch } from "@/components/ui/switch";
import { generateObjectId } from "@/lib/generateCode";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useToast } from "@/components/ui/use-toast";

export default function DynamicForm({ initialData, isEdit = false }) {
  const [selected, setSelected] = useState([]);
  const [tag, setTag] = useState([]);
  const [posterFile, setPosterFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [movieFile, setMovieFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPublish, setIsPublish] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [objectId, setObjectId] = useState("");
  const { toast } = useToast();
  const handleFileSubmit = async (file, type) => {
    const form = document.getElementById("movieForm");
    const formData = new FormData(form);
    if (!file) {
      toast({ title: `Please upload a ${type} file.` });
      return;
    }

    const id = initialData?._id || objectId?.toString();
    if (!id) {
      toast({ title: "Generate a Movie Id first.", variant: "destructive" });
      return;
    }

    try {
      // 1. Ensure the content doc exists (metadata) BEFORE uploading the movie,
      //    so the transcode completion handler can update it.
      await saveMetadata({
        _id: id,
        title: formData.get("title"),
        description: formData.get("description"),
        type: formData.get("type"),
        releaseDate: formData.get("date"),
        genres: selected,
        tags: tag,
        isPublish: formData.get("isPublish") === "on",
        deleted: formData.get("isDeleted") === "on",
      });

      // 2. Upload the asset. Movie -> raw bucket (transcode); images -> public.
      const kind = type === "movie" ? "video" : "image";
      const { publicUrl } = await uploadAsset(id, file, kind, setProgress);

      // 3. For images, save the resulting public URL on the content.
      if (type === "thumbnail") await updateContent(id, { thumbnail_url: publicUrl });
      if (type === "poster") await updateContent(id, { poster_url: publicUrl });

      toast({
        title: "File upload",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`,
      });
    } catch (e) {
      toast({ title: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  return (
    <div className="col-span-10  ">
      <div className="container py-12 gap-4 ">
        <div className="flex justify-between">
          <div className="col-span-1">
            <form
              className="w-96 flex flex-col gap-12"
              onSubmit={(e) => {
                e.preventDefault();
                handleMovieUpdate(e, selected, tag);
                toast({
                  title: `Form update successful`,
                });
              }}
              id="movieForm"
            >
              {/* Title and ID */}
              <div className="flex w-full items-center gap-1.5">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="title">Movie Title</Label>
                  <Input
                    type="text"
                    id="title"
                    name="title"
                    defaultValue={initialData.title || ""}
                    placeholder="Title"
                  />
                </div>

                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="id">Movie Id</Label>
                  <div className="flex gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Input
                            type="text"
                            id="id"
                            name="id"
                            defaultValue={initialData._id || objectId}
                            disabled
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{initialData._id || objectId.toString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {!isEdit ? (
                      <Button
                        type="button"
                        onClick={() => setObjectId(generateObjectId())}
                      >
                        {" "}
                        gen obj
                      </Button>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid w-full gap-1.5">

              <Label>Video Id</Label>
              <Input
                            type="text"
                            id="videoId"
                            name="videoId"
                            defaultValue={initialData.video_id || ""}
                            disabled
                          />
              </div>

              {/* Description */}
              <div className="grid w-full gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  placeholder="Type your message here."
                  name="description"
                  id="description"
                  defaultValue={initialData.description}
                />
              </div>

              {/* type  */}
              <div className="flex ">
                <div className="grid w-2/4 max-w-sm items-center gap-1.5">
                  <Label htmlFor="date">Type</Label>
                  <Select name="type" defaultValue={initialData.type}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="select Movie/series" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="series">Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* release data  */}
                <div className="grid w-2/4 max-w-sm items-center gap-1.5">
                  <Label htmlFor="date">Release Date</Label>
                  <Input
                    type="date"
                    id="date"
                    name="date"
                    placeholder="yyyy-mm-dd"
                    defaultValue={initialData.releaseDate}
                  />
                </div>
              </div>

              {/* Genre */}
              <div className="grid w-full gap-1.5">
                <Label htmlFor="genre">Genre</Label>
                <TagsInput
                  value={initialData.genres || selected}
                  onChange={setSelected}
                  name="genre"
                  placeHolder="Enter genre"
                />
              </div>
              {/* Tags */}
              <div className="grid w-full gap-1.5">
                <Label htmlFor="Tags">Tags</Label>
                <TagsInput
                  value={initialData.tags || tag}
                  onChange={setTag}
                  name="tag"
                  placeHolder="Enter genre"
                />
              </div>

              {/* File Inputs */}
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="movie">Movie</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="movie"
                    type="file"
                    name="movie"
                    onChange={(e) => setMovieFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    onClick={(e) => handleFileSubmit(movieFile, "movie")}
                  >
                    Upload Movie
                  </Button>
                </div>
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="thumbnail">Thumbnail</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="thumbnail"
                    type="file"
                    name="thumbnail"
                    onChange={(e) =>
                      setThumbnailFile(e.target.files?.[0] || null)
                    }
                  />
                  <Button
                    type="button"
                    onClick={(e) =>
                      handleFileSubmit(thumbnailFile, "thumbnail")
                    }
                  >
                    Upload Thumbnail
                  </Button>
                </div>
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="poster">Poster</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="poster"
                    type="file"
                    name="poster"
                    onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    onClick={(e) => handleFileSubmit(posterFile, "poster")}
                  >
                    Upload Poster
                  </Button>
                </div>
              </div>

              {/* Publish and Delete Toggles */}
              <div className="flex w-full max-w-sm items-center gap-5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="isPublish">Is Publish</Label>
                  <Switch
                    name="isPublish"
                    checked={initialData.isPublish || isPublish}
                    onCheckedChange={() => setIsPublish(!isPublish)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isDeleted">Is Deleted</Label>
                  <Switch
                    name="isDeleted"
                    checked={initialData.deleted || isDeleted}
                    onCheckedChange={() => setIsDeleted(!isDeleted)}
                  />
                </div>
              </div>

              <ProgressBar progress={progress} />
              {isEdit ? <Button type="submit">update</Button> : <></>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
