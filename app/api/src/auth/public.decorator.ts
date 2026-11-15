import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the global JwtAuthGuard.
 *
 * Authentication is deny-by-default: forget the decorator and the route needs
 * a valid bearer token instead of silently becoming public.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
