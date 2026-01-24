import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [CloudinaryService, EncryptionService],
  exports: [CloudinaryService, EncryptionService],
})
export class CommonModule {}
