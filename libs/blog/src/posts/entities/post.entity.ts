import { User } from '@app/blog/users/entities/user.entity';

export type Post =
  | {
      userId: number;
      id: number;
      title: string;
      body: string;
      user: never;
    }
  | {
      userId: never;
      id: number;
      title: string;
      body: string;
      user: User;
    };
