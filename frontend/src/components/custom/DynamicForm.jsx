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
  handleMovieMetadata,
  uploadToS3,
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
      toast({
        title: `Please upload a ${type} file.`,
      });
      return;
    }

    let prefix = formData.get("title");
    const fileS3Url = await uploadToS3([file], prefix, setProgress, type);

    console.log(`${type} S3 URL:`, fileS3Url);
    const fallbackId = objectId.toString();

    const fallbackTitle = formData.get("title");

    const fallbackDescription = formData.get("description");
    const fallbackType = formData.get("type");
    const fallbackRelease = formData.get("date");
    const fallbackIsPublish = formData.get("isPublish") === "on";
    const fallbackIsDeleted = formData.get("isDeleted") === "on";
    // If all metadata needs to be submitted after file upload
    handleMovieMetadata(
      {
        id: initialData?._id || fallbackId,
        title: initialData?.title || fallbackTitle,
        description: initialData?.description || fallbackDescription,
        type: initialData?.type || fallbackType,
        releaseDate: initialData?.releaseDate || fallbackRelease,
        isPublish: initialData?.isPublish ?? fallbackIsPublish,
        isDeleted: initialData?.deleted ?? fallbackIsDeleted,
      },
      selected, // genres
      tag, // tags
      { ["key"]: fileS3Url["key"], keyType: fileS3Url["keyType"] } // Specify the file type (movie, thumbnail, or poster)// Only pass movie URL if it's a movie upload
    );

    toast({
      title: "File upload",
      description: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } uploaded successfully!`,
    });
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
