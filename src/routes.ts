import { FastifyInstance } from 'fastify';
import { prisma } from './lib/prisma';

import { z } from 'zod';
import dayjs from 'dayjs';

export async function appRoutes(app: FastifyInstance) {
    app.post('/habits', async (request) => {
        const createHabitBody = z.object({ 
            title: z.string(), 
            weekDays: z.array(
                z.number().min(0).max(6)
            ),
        });

        const { title, weekDays } = createHabitBody.parse(request.body);

        const today = dayjs().startOf('day').toDate();

        await prisma.habit.create({
            data: {
                title,
                created_at: today,
                weekDays: { 
                    create: weekDays.map((weekDay) => { 
                        return {
                            week_day: weekDay, 
                        }
                    }),
                }
            }
        });
    });

    app.get('/day', async (request) => {
        const getDayparams = z.object({
            date: z.coerce.date(), //transf. string em data
        });

        const { date } = getDayparams.parse(request.query); 
        
        const parsedDate = dayjs(date).startOf('day'); //zera horário
        const weekDay = parsedDate.get('day'); //dia da semana

        const possibleHabits = await prisma.habit.findMany({
            where: {
                created_at: {
                    lte: date, //criação < ou = atual
                },
                weekDays: {
                    some: {
                        week_day: weekDay,
                    }
                }
            },
        });

        const day = await prisma.day.findFirst({
            where: {
                date: parsedDate.toDate(),
            },
            include: {
                dayHabits: true, //incluir os hábitos completos
            }
        });

        const completedHabits = day?.dayHabits.map(dayHabit => {
            return dayHabit.habit_id //somente o id
        }) ?? []

        return {
            possibleHabits,
            completedHabits,
        }
    });
}