import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { UsersService } from '../users/users.service';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

describe('PostsService', () => {
  let service: PostsService;
  let cacheManager: Cache;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        Logger,
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a post', (done) => {
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        body: 'This is a new post',
        userId: 1,
      };

      const mockResponse: AxiosResponse<Post> = {
        data: { id: 1, ...createPostDto },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: undefined,
      };

      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

      service.create(createPostDto).subscribe((result) => {
        expect(httpService.post).toHaveBeenCalledWith('', createPostDto);
        expect(result).toEqual(mockResponse.data);
        done();
      });
    });

    it('should throw an exception if HTTP request fails', (done) => {
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        body: 'This is a new post',
        userId: 1,
      };

      const errorResponse = {
        message: 'Network Error',
      };

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.create(createPostDto).subscribe({
        next: () => {
          // Should not reach here
        },
        error: (err) => {
          expect(httpService.post).toHaveBeenCalledWith('', createPostDto);
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(err.message).toBe('Failed to create post');
          done();
        },
      });
    });
  });

  describe('findAll', () => {
    it('should fetch posts with pagination', (done) => {
      const page = 1;
      const limit = 10;
      const mockPosts: Post[] = [
        { id: 1, title: 'Post 1', body: 'Content 1', userId: 1 },
        // Add more mock posts as needed
      ];

      const mockResponse: AxiosResponse<Post[]> = {
        data: mockPosts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: undefined,
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      service.findAll(page, limit).subscribe((result) => {
        expect(httpService.get).toHaveBeenCalledWith('', {
          params: { _page: page, _limit: limit },
        });
        expect(result).toEqual(mockPosts);
        done();
      });
    });

    it('should throw an exception if HTTP request fails', (done) => {
      const page = 1;
      const limit = 10;

      const errorResponse = {
        message: 'Network Error',
      };

      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.findAll(page, limit).subscribe({
        next: () => {
          // Should not reach here
        },
        error: (err) => {
          expect(httpService.get).toHaveBeenCalledWith('', {
            params: { _page: page, _limit: limit },
          });
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(err.message).toBe('Failed to fetch posts');
          done();
        },
      });
    });
  });

  describe('findOne', () => {
    const postId = 1;
    const cacheKey = `post_with_user_${postId}`;
    const mockPost: Post = {
      id: postId,
      title: 'Post Title',
      body: 'Post Content',
      userId: 1,
    };
    const mockUser = {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      // Add other user properties as needed
    };
    const combinedData = { ...mockPost, user: mockUser };

    it('should return the post from cache if it exists', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(combinedData);

      service.findOne(postId).subscribe((result) => {
        expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
        expect(result).toEqual(combinedData);
        done();
      });
    });

    it('should handle errors when fetching post', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const errorResponse = {
        response: { status: 404 },
        message: 'Not Found',
      };
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.findOne(postId).subscribe({
        next: () => {},
        error: (err) => {
          expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
          expect(httpService.get).toHaveBeenCalledWith(postId.toString());
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
          expect(err.message).toBe(`Post with id ${postId} not found`);
          done();
        },
      });
    });
  });

  describe('update', () => {
    const postId = 1;
    const updatePostDto: UpdatePostDto = {
      title: 'Updated Title',
      body: 'Updated Body',
      userId: 1,
    };
    const updatedPost: Post = {
      id: postId,
      title: updatePostDto.title,
      body: updatePostDto.body,
      userId: 1,
    };

    it('should successfully update a post and delete cache', (done) => {
      const mockResponse: AxiosResponse<Post> = {
        data: updatedPost,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: undefined,
      };

      (httpService.patch as jest.Mock).mockReturnValue(of(mockResponse));
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      service.update(postId, updatePostDto).subscribe((result) => {
        expect(httpService.patch).toHaveBeenCalledWith(
          postId.toString(),
          updatePostDto,
        );
        expect(cacheManager.del).toHaveBeenCalledWith(
          `post_with_user_${postId}`,
        );
        expect(result).toEqual(updatedPost);
        done();
      });
    });

    it('should handle not found error when updating', (done) => {
      const errorResponse = {
        response: { status: 404 },
        message: 'Not Found',
      };
      (httpService.patch as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.update(postId, updatePostDto).subscribe({
        next: () => {},
        error: (err) => {
          expect(httpService.patch).toHaveBeenCalledWith(
            postId.toString(),
            updatePostDto,
          );
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
          expect(err.message).toBe(`Post with id ${postId} not found`);
          done();
        },
      });
    });

    it('should handle other errors when updating', (done) => {
      const errorResponse = {
        message: 'Network Error',
      };
      (httpService.patch as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.update(postId, updatePostDto).subscribe({
        next: () => {},
        error: (err) => {
          expect(httpService.patch).toHaveBeenCalledWith(
            postId.toString(),
            updatePostDto,
          );
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(err.message).toBe(`Failed to update post with id ${postId}`);
          done();
        },
      });
    });
  });

  describe('remove', () => {
    const postId = 1;

    it('should successfully remove a post and delete cache', (done) => {
      const mockResponse: AxiosResponse<null> = {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: undefined,
      };

      (httpService.delete as jest.Mock).mockReturnValue(of(mockResponse));
      (cacheManager.del as jest.Mock).mockResolvedValue(undefined);

      service.remove(postId).subscribe((result) => {
        expect(httpService.delete).toHaveBeenCalledWith(postId.toString());
        expect(cacheManager.del).toHaveBeenCalledWith(
          `post_with_user_${postId}`,
        );
        expect(result).toBeNull();
        done();
      });
    });

    it('should handle not found error when removing', (done) => {
      const errorResponse = {
        response: { status: 404 },
        message: 'Not Found',
      };
      (httpService.delete as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.remove(postId).subscribe({
        next: () => {},
        error: (err) => {
          expect(httpService.delete).toHaveBeenCalledWith(postId.toString());
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
          expect(err.message).toBe(`Post with id ${postId} not found`);
          done();
        },
      });
    });

    it('should handle other errors when removing', (done) => {
      const errorResponse = {
        message: 'Network Error',
      };
      (httpService.delete as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.remove(postId).subscribe({
        next: () => {},
        error: (err) => {
          expect(httpService.delete).toHaveBeenCalledWith(postId.toString());
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(err.message).toBe(`Failed to delete post with id ${postId}`);
          done();
        },
      });
    });
  });

  describe('search', () => {
    const searchTerm = 'NestJS';
    const mockPosts: Post[] = [
      { id: 1, title: 'NestJS Post', body: 'Content', userId: 1 },
      // Add more mock posts as needed
    ];

    it('should successfully return search results', (done) => {
      const mockResponse: AxiosResponse<Post[]> = {
        data: mockPosts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: undefined,
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      service.search(searchTerm).subscribe((result) => {
        expect(httpService.get).toHaveBeenCalledWith('', {
          params: { q: searchTerm },
        });
        expect(result).toEqual(mockPosts);
        done();
      });
    });

    it('should handle errors during search', (done) => {
      const errorResponse = {
        message: 'Network Error',
      };
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.search(searchTerm).subscribe({
        next: () => {},
        error: (err) => {
          expect(httpService.get).toHaveBeenCalledWith('', {
            params: { q: searchTerm },
          });
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(err.message).toBe('Failed to search posts');
          done();
        },
      });
    });
  });
});
