"use client";

import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

import {
  ProfileAvatarValidationError,
  fetchProfileAvatarStorageAvailable,
  uploadProfileAvatarToStorage,
} from "@/features/settings/app/services/profile-avatar-storage.service";
import type { ProfileFormValues } from "@/features/settings/app/utils/schemas";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { FormInput } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field";
import { Skeleton } from "@/shared/components/ui/skeleton";

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

export function AccountProfileImageField() {
  const t = useTranslations("settings.profile");
  const { setValue, watch } = useFormContext<ProfileFormValues>();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const imageUrl = watch("image")?.trim() ?? "";

  useEffect(() => {
    void fetchProfileAvatarStorageAvailable().then(setStorageAvailable);
  }, []);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || storageAvailable !== true) return;
      setUploading(true);
      try {
        const url = await uploadProfileAvatarToStorage(file);
        setValue("image", url, { shouldDirty: true, shouldValidate: true });
        toast.success(t("imageUploadSuccess"));
      } catch (e) {
        if (e instanceof ProfileAvatarValidationError) {
          if (e.code === "INVALID_TYPE") {
            toast.error(t("imageInvalidType"));
          } else if (e.code === "TOO_LARGE") {
            toast.error(t("imageTooLarge", { maxMb: 5 }));
          }
        } else {
          toast.error(e instanceof Error ? e.message : t("imageUploadError"));
        }
      } finally {
        setUploading(false);
      }
    },
    [setValue, storageAvailable, t],
  );

  if (storageAvailable === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!storageAvailable) {
    return (
      <FormInput name="image" label={t("image")} description={t("imageHint")} type="url" autoComplete="off" placeholder="https://" />
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{t("image")}</FieldLabel>
      <FieldDescription>{t("imageUploadHint")}</FieldDescription>
      <div
        className={cn(
          "border-input bg-background/50 mt-2 flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-5 transition-colors",
          dragOver && "border-primary bg-primary/5",
          uploading && "pointer-events-none opacity-70",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_IMAGES}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa do storage ou legado
          <img
            src={imageUrl}
            alt=""
            className="border-border size-16 rounded-full border object-cover"
          />
        ) : (
          <div className="bg-muted/60 text-muted-foreground flex size-16 items-center justify-center rounded-full border border-dashed">
            <ImagePlus className="size-7" aria-hidden />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {t("imageChooseFile")}
          </Button>
          {imageUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={uploading}
              onClick={() => setValue("image", "", { shouldDirty: true, shouldValidate: true })}
            >
              <Trash2 className="size-4" />
              {t("imageClear")}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-center text-xs">{dragOver ? t("imageDropRelease") : t("imageDropPrompt")}</p>
      </div>
    </Field>
  );
}
