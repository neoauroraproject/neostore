import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { extname, join, normalize, resolve } from 'path';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { WorkspaceGuardService, CatalogModule } from '../catalog/catalog.module';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

function storageRoot() {
  return process.env.STORAGE_LOCAL_PATH || join(process.cwd(), 'data', 'storage');
}

function workspaceDir(workspaceId: string) {
  const root = resolve(storageRoot());
  const dir = resolve(join(root, workspaceId));
  if (!dir.startsWith(root + '\\') && !dir.startsWith(root + '/') && dir !== root) {
    throw new BadRequestException('Invalid workspace path');
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Injectable()
export class MediaService {
  constructor(private readonly access: WorkspaceGuardService) {}

  async saveUpload(
    userId: string,
    workspaceId: string,
    file?: Express.Multer.File,
  ): Promise<{ url: string; path: string; filename: string }> {
    await this.access.requireMember(userId, workspaceId);
    if (!file) throw new BadRequestException('file required');
    const ext = extname(file.originalname || '').toLowerCase() || extname(file.filename).toLowerCase();
    if (!ALLOWED.has(ext) || (file.mimetype && !MIME.has(file.mimetype))) {
      throw new BadRequestException('Only jpeg, png, webp allowed');
    }
    if (file.size > MAX_BYTES) throw new BadRequestException('File too large (max 5MB)');
    const filename = file.filename;
    return {
      filename,
      path: `${workspaceId}/${filename}`,
      url: `/api/media/${workspaceId}/${filename}`,
    };
  }

  resolveFile(workspaceId: string, filename: string) {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }
    const dir = workspaceDir(workspaceId);
    const full = resolve(join(dir, filename));
    if (!full.startsWith(dir)) throw new BadRequestException('Invalid path');
    if (!existsSync(full)) return null;
    return full;
  }
}

@Controller('admin/workspaces/:workspaceId/media')
@UseGuards(AuthGuard('jwt'))
export class MediaAdminController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES },
      storage: diskStorage({
        destination: (req, _file, cb) => {
          try {
            const workspaceId = String((req as any).params?.workspaceId || '');
            cb(null, workspaceDir(workspaceId));
          } catch (e: any) {
            cb(e, '');
          }
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
          const safe = ALLOWED.has(ext) ? ext : '.jpg';
          cb(null, `${randomUUID()}${safe}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase();
        if (!ALLOWED.has(ext) || !MIME.has(file.mimetype)) {
          return cb(new BadRequestException('Only jpeg, png, webp allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @Req() req: { user: { id: string } },
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.saveUpload(req.user.id, workspaceId, file);
  }
}

@Controller('media')
export class MediaPublicController {
  constructor(private readonly media: MediaService) {}

  @Get(':workspaceId/:filename')
  async get(
    @Param('workspaceId') workspaceId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const full = this.media.resolveFile(workspaceId, normalize(filename));
    if (!full) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const ext = extname(full).toLowerCase();
    const type =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    createReadStream(full).pipe(res);
  }
}

@Module({
  imports: [CatalogModule],
  providers: [MediaService],
  controllers: [MediaAdminController, MediaPublicController],
  exports: [MediaService],
})
export class MediaModule {}
