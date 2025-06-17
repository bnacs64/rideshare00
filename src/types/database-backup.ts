// BACKUP OF OLD DATABASE TYPES
// This file contains the old database types before the clean backend migration
// See database.ts for the current clean types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Old database types - backed up before clean migration
