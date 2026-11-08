import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Склеивает классы Tailwind; при конфликте побеждает последний. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
