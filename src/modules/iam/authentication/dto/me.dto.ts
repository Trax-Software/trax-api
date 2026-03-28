import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;
}

export class MeMembershipDto {
  @ApiProperty({ enum: Role })
  role!: Role;
}

export class MeWorkspaceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  credits!: number;

  @ApiProperty({ nullable: true })
  metaAdAccountId!: string | null;

  @ApiProperty({ nullable: true })
  metaPageId!: string | null;
}

export class MeDto {
  @ApiProperty({ type: MeUserDto })
  user!: MeUserDto;

  @ApiProperty({ type: MeMembershipDto })
  membership!: MeMembershipDto;

  @ApiProperty({ type: MeWorkspaceDto })
  workspace!: MeWorkspaceDto;
}
