import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AxiosResponse } from 'axios';
import { map, catchError, switchMap, of, from, tap } from 'rxjs';
import { UsersService } from '../users/users.service';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {}

  create(createPostDto: CreatePostDto) {
    return this.httpService.post('', createPostDto).pipe(
      map((response: AxiosResponse) => response.data),
      catchError((error) => {
        throw new HttpException(
          'Failed to create post',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { cause: error },
        );
      }),
    );
  }

  findAll(page: number, limit: number) {
    return this.httpService
      .get('', { params: { _page: page, _limit: limit } })
      .pipe(
        map((response: AxiosResponse) => response.data),
        catchError((error) => {
          throw new HttpException(
            'Failed to fetch posts',
            HttpStatus.INTERNAL_SERVER_ERROR,
            { cause: error },
          );
        }),
      );
  }

  findOne(id: number) {
    const cacheKey = `post_with_user_${id}`;

    return from(this.cacheManager.get<Post>(cacheKey)).pipe(
      switchMap((cachedData) => {
        if (cachedData) {
          this.logger.log(`Using cached post with id ${id}`);
          return of(cachedData);
        }

        this.logger.log(`Fetching post with id ${id}`);

        return this.httpService.get<Post>(id.toString()).pipe(
          map((response) => response.data),
          switchMap(({ userId, ...post }) => {
            return this.usersService.findOne(userId).pipe(
              map((user) => ({ ...post, user })),
              switchMap((data) =>
                from(this.cacheManager.set(cacheKey, data, 60000)).pipe(
                  map(() => data),
                  catchError((cacheError) => {
                    this.logger.warn(
                      `Failed to cache data: ${cacheError.message}`,
                    );
                    return of(data);
                  }),
                ),
              ),
            );
          }),
          catchError((error) => {
            if (error.response && error.response.status === 404) {
              throw new HttpException(
                `Post with id ${id} not found`,
                HttpStatus.NOT_FOUND,
                { cause: error },
              );
            }
            this.logger.error(
              `Error fetching post with id ${id}: ${error.message}`,
            );
            throw new HttpException(
              'An error occurred while fetching the post',
              HttpStatus.INTERNAL_SERVER_ERROR,
              { cause: error },
            );
          }),
        );
      }),
    );
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return this.httpService.patch<Post>(id.toString(), updatePostDto).pipe(
      map((response) => response.data),
      tap(() => this.cacheManager.del(`post_with_user_${id}`)),
      catchError((error) => {
        if (error.response && error.response.status === 404) {
          throw new HttpException(
            `Post with id ${id} not found`,
            HttpStatus.NOT_FOUND,
            { cause: error },
          );
        }

        throw new HttpException(
          `Failed to update post with id ${id}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
          { cause: error },
        );
      }),
    );
  }

  remove(id: number) {
    return this.httpService.delete<Post>(id.toString()).pipe(
      map((response) => response.data),
      tap(() => this.cacheManager.del(`post_with_user_${id}`)),
      catchError((error) => {
        if (error.response && error.response.status === 404) {
          throw new HttpException(
            `Post with id ${id} not found`,
            HttpStatus.NOT_FOUND,
            { cause: error },
          );
        }

        throw new HttpException(
          `Failed to delete post with id ${id}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
          { cause: error },
        );
      }),
    );
  }

  search(term: string) {
    return this.httpService.get<Post[]>('', { params: { q: term } }).pipe(
      map((response) => response.data),
      catchError((error) => {
        throw new HttpException(
          'Failed to search posts',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { cause: error },
        );
      }),
    );
  }
}
