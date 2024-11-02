import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { from, of, switchMap, map, catchError, throwError } from 'rxjs';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  findOne(id: number) {
    const userCacheKey = `user_${id}`;

    return from(this.cacheManager.get<any>(userCacheKey)).pipe(
      switchMap((cachedUser) => {
        if (cachedUser) {
          this.logger.log(`Using cached user with id ${id}`);
          return of(cachedUser);
        }

        this.logger.log(`Fetching user with id ${id}`);

        return this.httpService.get(id.toString()).pipe(
          map((response: AxiosResponse) => response.data),
          switchMap((user) =>
            from(this.cacheManager.set(userCacheKey, user, 60000)).pipe(
              map(() => user),
            ),
          ),
          catchError((error) => {
            if (error.response && error.response.status === 404) {
              return throwError(
                () =>
                  new HttpException(
                    `User with id ${id} not found`,
                    HttpStatus.NOT_FOUND,
                    { cause: error },
                  ),
              );
            }
            this.logger.error(
              `Error fetching user with id ${id}: ${error.message}`,
            );
            return throwError(
              () =>
                new HttpException(
                  'An error occurred while fetching the user',
                  HttpStatus.INTERNAL_SERVER_ERROR,
                  { cause: error },
                ),
            );
          }),
        );
      }),
    );
  }
}
