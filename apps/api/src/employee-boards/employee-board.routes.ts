import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  CreateEmployeeBoardSchema,
  RenameEmployeeBoardSchema,
  CreateEmployeeGroupSchema,
  UpdateEmployeeGroupSchema,
  ReorderEmployeeGroupsSchema,
  AddExistingMembersSchema,
  AddNewEmployeeSchema,
  MoveMemberSchema,
  SetManagerSchema,
  EmployeeBoardColumnConfigSchema,
  CreateEmployeeColumnSchema,
  UpdateEmployeeColumnSchema,
  SetEmployeeFieldValueSchema,
} from '@deckgauge/shared';
import type { EmployeeBoardService } from './employee-board.service.js';
import { OrgTreeCycleError } from '../org-trees/org-tree.service.js';

export interface EmployeeBoardRoutesDeps {
  serviceFactory: () => EmployeeBoardService;
}

const uuid = z.string().uuid();
const badId = (reply: FastifyReply) => reply.code(400).send({ error: 'bad id' });

export function employeeBoardRoutes(deps: EmployeeBoardRoutesDeps) {
  const service = deps.serviceFactory();
  return async function plugin(app: FastifyInstance) {
    app.get<{ Params: { treeId: string } }>('/org-trees/:treeId/employee-boards', async (req, reply) => {
      if (!uuid.safeParse(req.params.treeId).success) return badId(reply);
      return service.listBoards(req.params.treeId);
    });

    app.post<{ Params: { treeId: string } }>('/org-trees/:treeId/employee-boards', async (req, reply) => {
      if (!uuid.safeParse(req.params.treeId).success) return badId(reply);
      const body = CreateEmployeeBoardSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return reply.code(201).send(await service.createBoard(req.params.treeId, body.data));
    });

    app.get<{ Params: { boardId: string } }>('/employee-boards/:boardId', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const board = await service.getBoard(req.params.boardId, { includeSalary: req.isAdmin ?? false });
      if (!board) return reply.code(404).send({ error: 'not found' });
      return board;
    });

    app.patch<{ Params: { boardId: string } }>('/employee-boards/:boardId', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = RenameEmployeeBoardSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.renameBoard(req.params.boardId, body.data.name);
      return reply.code(204).send();
    });

    app.delete<{ Params: { boardId: string } }>('/employee-boards/:boardId', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      await service.deleteBoard(req.params.boardId);
      return reply.code(204).send();
    });

    app.post<{ Params: { boardId: string } }>('/employee-boards/:boardId/groups', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = CreateEmployeeGroupSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.createGroup(req.params.boardId, body.data);
    });

    app.patch<{ Params: { groupId: string } }>('/employee-groups/:groupId', async (req, reply) => {
      if (!uuid.safeParse(req.params.groupId).success) return badId(reply);
      const body = UpdateEmployeeGroupSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.updateGroup(req.params.groupId, body.data);
      return reply.code(204).send();
    });

    app.delete<{ Params: { groupId: string } }>('/employee-groups/:groupId', async (req, reply) => {
      if (!uuid.safeParse(req.params.groupId).success) return badId(reply);
      await service.deleteGroup(req.params.groupId);
      return reply.code(204).send();
    });

    app.patch<{ Params: { boardId: string } }>('/employee-boards/:boardId/groups/reorder', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = ReorderEmployeeGroupsSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.reorderGroups(body.data.order);
      return reply.code(204).send();
    });

    app.post<{ Params: { boardId: string } }>('/employee-boards/:boardId/members', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = AddExistingMembersSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.addExistingMembers(req.params.boardId, body.data.orgEmployeeIds);
      return reply.code(204).send();
    });

    app.post<{ Params: { boardId: string } }>('/employee-boards/:boardId/employees', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = AddNewEmployeeSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.addNewEmployee(req.params.boardId, body.data);
    });

    app.patch<{ Params: { memberId: string } }>('/employee-board-members/:memberId/move', async (req, reply) => {
      if (!uuid.safeParse(req.params.memberId).success) return badId(reply);
      const body = MoveMemberSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.moveMember(req.params.memberId, body.data);
      return reply.code(204).send();
    });

    app.delete<{ Params: { memberId: string } }>('/employee-board-members/:memberId', async (req, reply) => {
      if (!uuid.safeParse(req.params.memberId).success) return badId(reply);
      await service.removeMember(req.params.memberId);
      return reply.code(204).send();
    });

    app.patch<{ Params: { boardId: string } }>('/employee-boards/:boardId/columns', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = EmployeeBoardColumnConfigSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.setColumnConfig(req.params.boardId, body.data);
      return reply.code(204).send();
    });

    app.patch<{ Params: { employeeId: string } }>('/org-employees/:employeeId/manager', async (req, reply) => {
      if (!uuid.safeParse(req.params.employeeId).success) return badId(reply);
      const body = SetManagerSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      try {
        await service.setManager(req.params.employeeId, body.data.managerId);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof OrgTreeCycleError) return reply.code(409).send({ error: 'cycle' });
        throw err;
      }
    });

    app.post<{ Params: { boardId: string } }>('/employee-boards/:boardId/custom-columns', async (req, reply) => {
      if (!uuid.safeParse(req.params.boardId).success) return badId(reply);
      const body = CreateEmployeeColumnSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.createColumn(req.params.boardId, body.data);
    });

    app.patch<{ Params: { columnId: string } }>('/employee-columns/:columnId', async (req, reply) => {
      if (!uuid.safeParse(req.params.columnId).success) return badId(reply);
      const body = UpdateEmployeeColumnSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.updateColumn(req.params.columnId, body.data);
      return reply.code(204).send();
    });

    app.delete<{ Params: { columnId: string } }>('/employee-columns/:columnId', async (req, reply) => {
      if (!uuid.safeParse(req.params.columnId).success) return badId(reply);
      await service.deleteColumn(req.params.columnId);
      return reply.code(204).send();
    });

    app.put('/employee-field-values', async (req, reply) => {
      const body = SetEmployeeFieldValueSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      await service.setFieldValue(body.data.employeeColumnId, body.data.orgEmployeeId, body.data.value);
      return reply.code(204).send();
    });
  };
}
