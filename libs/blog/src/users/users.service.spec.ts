import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let cacheManager: Cache;
  let httpService: HttpService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        Logger,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    httpService = module.get<HttpService>(HttpService);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    const userId = 1;
    const userCacheKey = `user_${userId}`;
    const mockUser: User = {
      id: userId,
      name: 'John Doe',
      email: 'john.doe@example.com',
      username: '',
      address: undefined,
      phone: '',
      website: '',
      company: undefined,
    };

    it('should return the user from the cache if it exists', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(mockUser);

      service.findOne(userId).subscribe((result) => {
        expect(cacheManager.get).toHaveBeenCalledWith(userCacheKey);
        expect(result).toEqual(mockUser);
        done();
      });
    });

    it('should fetch the user via HTTP if not in cache and cache the result', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const axiosResponse: AxiosResponse<User> = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: undefined,
      };
      (httpService.get as jest.Mock).mockReturnValue(of(axiosResponse));

      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      service.findOne(userId).subscribe((result) => {
        expect(cacheManager.get).toHaveBeenCalledWith(userCacheKey);
        expect(httpService.get).toHaveBeenCalledWith(userId.toString());
        expect(cacheManager.set).toHaveBeenCalledWith(
          userCacheKey,
          mockUser,
          60000,
        );
        expect(result).toEqual(mockUser);
        done();
      });
    });

    it('should throw a 404 HttpException if user not found via HTTP', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const errorResponse = {
        response: {
          status: 404,
          data: {},
        },
      };
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.findOne(userId).subscribe({
        next: () => {
          // Should not reach here
        },
        error: (err) => {
          expect(cacheManager.get).toHaveBeenCalledWith(userCacheKey);
          expect(httpService.get).toHaveBeenCalledWith(userId.toString());
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
          expect(err.message).toBe(`User with id ${userId} not found`);
          done();
        },
      });
    });

    it('should throw a 500 HttpException if an error occurs while fetching the user', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const errorResponse = {
        message: 'Network Error',
      };
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => errorResponse),
      );

      service.findOne(userId).subscribe({
        next: () => {
          // Should not reach here
        },
        error: (err) => {
          expect(cacheManager.get).toHaveBeenCalledWith(userCacheKey);
          expect(httpService.get).toHaveBeenCalledWith(userId.toString());
          expect(err).toBeInstanceOf(HttpException);
          expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(err.message).toBe('An error occurred while fetching the user');
          done();
        },
      });
    });

    it('should log an error if caching fails but still return the user', (done) => {
      (cacheManager.get as jest.Mock).mockResolvedValue(null);

      const axiosResponse: AxiosResponse<User> = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: undefined,
      };
      (httpService.get as jest.Mock).mockReturnValue(of(axiosResponse));

      const cacheSetError = new Error('Cache set error');
      (cacheManager.set as jest.Mock).mockRejectedValue(cacheSetError);

      jest.spyOn(logger, 'error');

      service.findOne(userId).subscribe((result) => {
        expect(cacheManager.get).toHaveBeenCalledWith(userCacheKey);
        expect(httpService.get).toHaveBeenCalledWith(userId.toString());
        expect(cacheManager.set).toHaveBeenCalledWith(
          userCacheKey,
          mockUser,
          60000,
        );
        expect(result).toEqual(mockUser);
        done();
      });
    });
  });
});
